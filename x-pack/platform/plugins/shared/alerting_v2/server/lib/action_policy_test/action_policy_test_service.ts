/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  ACTION_POLICY_TEST_SEED_MAX,
  type ActionPolicyResponse,
  type ActionPolicyTestDestination,
  type ActionPolicyTestPreviewResponse,
  type ActionPolicyTestSendResponse,
  type ActionPolicyTestSendResult,
} from '@kbn/alerting-v2-schemas';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { inject, injectable } from 'inversify';
import { isError } from 'lodash';
import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { AlertingServerStartDependencies } from '../../types';
import { ActionPolicyClient } from '../action_policy_client';
import { DEFAULT_GROUPING } from '../dispatcher/constants';
import { WorkflowsManagementApiToken } from '../dispatcher/steps/dispatch_step_tokens';
import { KibanaBaseUrlToken } from '../dispatcher/tokens';
import type { ActionPolicy, ActionPolicyWorkflowPayload } from '../dispatcher/types';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import type { EbtServiceContract } from '../services/ebt_service/ebt_service';
import { EbtServiceToken } from '../services/ebt_service/tokens';
import type { LicenseServiceContract } from '../services/license_service/license_service';
import { LicenseServiceToken } from '../services/license_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import { getMatcherType } from '../telemetry/action_policy_ebt_event';
import { ACTION_POLICY_TEST_SENT_EBT_EVENT_TYPE } from '../telemetry/action_policy_test_ebt_event';
import { buildTestScenario, type TestScenario } from './test_scenario_builder';

const TEST_SEND_AUDIT_ACTION = 'alerting_v2_action_policy_test_send';

/** Workflow privileges a user needs to see a destination as runnable: reading it and running it. */
const WORKFLOW_RUN_PRIVILEGES = [
  ...WorkflowsManagementOperationPrivileges.read,
  ...WorkflowsManagementOperationPrivileges.execute,
];

const toErrorMessage = (error: unknown): string => (isError(error) ? error.message : String(error));

const getWorkflowDestinationIds = ({ destinations }: ActionPolicyResponse): string[] =>
  destinations.filter(({ type }) => type === 'workflow').map(({ id }) => id);

const createSeed = (): number => Math.floor(Math.random() * (ACTION_POLICY_TEST_SEED_MAX + 1));

export interface SendTestNotificationParams {
  policyId: string;
  seed: number;
  destinationIds: readonly string[];
}

/**
 * Builds test notifications of a saved action policy from synthetic alerts, and sends them to the
 * policy destinations as workflow test runs of the current user. Reads only the policy and its
 * destination workflows. Writes nothing to `.alert-actions` and emits no dispatcher events.
 */
@injectable()
export class ActionPolicyTestService {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(ActionPolicyClient) private readonly actionPolicyClient: ActionPolicyClient,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsServerPluginSetup['management'],
    @inject(LicenseServiceToken) private readonly licenseService: LicenseServiceContract,
    @inject(EbtServiceToken) private readonly ebtService: EbtServiceContract,
    @inject(CoreStart('security')) private readonly coreSecurity: SecurityServiceStart,
    @inject(PluginStart<AlertingServerStartDependencies['security']>('security'))
    private readonly security: SecurityPluginStart,
    @inject(KibanaBaseUrlToken) private readonly kibanaBaseUrl: string,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('actionPolicyClient');
  }

  public async preview({
    policyId,
    seed = createSeed(),
  }: {
    policyId: string;
    seed?: number;
  }): Promise<ActionPolicyTestPreviewResponse> {
    await this.licenseService.assertActionPoliciesLicense();
    const policy = await this.actionPolicyClient.getActionPolicy({ id: policyId });
    const scenario = this.buildScenario(policy, seed);
    const destinations = await this.describeDestinations(policy);

    if (scenario.status === 'unsupported') {
      return { status: 'unsupported', reason: scenario.reason, destinations };
    }

    return {
      status: 'ok',
      seed,
      groups: scenario.groups.map(({ id, groupKey, payload }) => ({
        id,
        group_key: groupKey,
        payload: { ...payload },
      })),
      destinations,
    };
  }

  public async send({
    policyId,
    seed,
    destinationIds,
  }: SendTestNotificationParams): Promise<ActionPolicyTestSendResponse> {
    await this.licenseService.assertActionPoliciesLicense();
    const policy = await this.actionPolicyClient.getActionPolicy({ id: policyId });

    const workflowIds = [...new Set(destinationIds)];
    const policyWorkflowIds = new Set(getWorkflowDestinationIds(policy));
    const foreignIds = workflowIds.filter((id) => !policyWorkflowIds.has(id));
    if (foreignIds.length > 0) {
      throw Boom.badRequest(
        `Workflows [${foreignIds.join(', ')}] are not destinations of action policy [${policyId}]`,
        {
          code: ALERTING_ERROR_CODES.ACTION_POLICY_TEST_INVALID_DESTINATIONS,
          details: { action_policy_id: policyId, destination_ids: foreignIds },
        }
      );
    }

    const scenario = this.buildScenario(policy, seed);
    if (scenario.status === 'unsupported') {
      throw Boom.badRequest(
        `A test notification cannot be sent for action policy [${policyId}] because its matcher has a KQL expression`,
        {
          code: ALERTING_ERROR_CODES.ACTION_POLICY_TEST_NOT_SUPPORTED,
          details: { action_policy_id: policyId, reason: scenario.reason },
        }
      );
    }

    const [{ payload }] = scenario.groups;
    const results = await Promise.all(
      workflowIds.map((workflowId) => this.runWorkflowTest(policyId, workflowId, payload))
    );

    this.reportSent(policy, payload, results);

    return { results };
  }

  private buildScenario(policy: ActionPolicyResponse, seed: number): TestScenario {
    return buildTestScenario({
      policy: this.toDispatcherPolicy(policy),
      kibanaBaseUrl: this.kibanaBaseUrl,
      seed,
      now: new Date(),
    });
  }

  private toDispatcherPolicy({
    id,
    name,
    enabled,
    destinations,
    matcher,
    grouping,
    throttle,
    snoozed_until: snoozedUntil,
  }: ActionPolicyResponse): ActionPolicy {
    return {
      id,
      spaceId: this.spaceId,
      name,
      enabled,
      destinations,
      matcher,
      grouping: grouping ?? DEFAULT_GROUPING,
      throttle: throttle ?? undefined,
      snoozedUntil,
    };
  }

  /**
   * Destination metadata for the current user. Workflows are only read when the user may read and
   * run workflows; otherwise each destination is reported as not executable, without its name.
   */
  private async describeDestinations(
    policy: ActionPolicyResponse
  ): Promise<ActionPolicyTestDestination[]> {
    const ids = getWorkflowDestinationIds(policy);
    if (ids.length === 0) {
      return [];
    }

    if (!(await this.canRunWorkflows())) {
      return ids.map((id) => ({ id, executable: false }));
    }

    const workflows = await this.workflowsManagement.getWorkflowsByIds(
      ids,
      this.spaceId,
      this.request
    );
    const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

    return ids.map((id) => {
      const workflow = workflowsById.get(id);
      if (!workflow) {
        return { id, executable: false };
      }
      return {
        id,
        name: workflow.name,
        enabled: workflow.enabled,
        executable: workflow.permissions?.execute !== false,
      };
    });
  }

  private async canRunWorkflows(): Promise<boolean> {
    const kibana = WORKFLOW_RUN_PRIVILEGES.map((privilege) =>
      this.security.authz.actions.api.get(privilege)
    );
    const { hasAllRequested } = await this.security.authz
      .checkPrivilegesWithRequest(this.request)
      .atSpace(this.spaceId, { kibana });
    return hasAllRequested;
  }

  private async runWorkflowTest(
    policyId: string,
    workflowId: string,
    payload: ActionPolicyWorkflowPayload
  ): Promise<ActionPolicyTestSendResult> {
    try {
      const workflowExecutionId = await this.workflowsManagement.testWorkflow({
        workflowId,
        inputs: { payload },
        spaceId: this.spaceId,
        request: this.request,
      });
      this.audit(policyId, workflowId, { workflowExecutionId });
      return { workflow_id: workflowId, workflow_execution_id: workflowExecutionId };
    } catch (error) {
      this.logger.warn({
        message: 'Failed to start the workflow test run of a test notification',
        error,
        code: ALERTING_LOG_CODES.ACTION_POLICY_TEST_RUN_FAILED,
        labels: { policy_id: policyId, workflow_id: workflowId, space_id: this.spaceId },
      });
      this.audit(policyId, workflowId, { error });
      return { workflow_id: workflowId, error: toErrorMessage(error) };
    }
  }

  private audit(
    policyId: string,
    workflowId: string,
    outcome: { workflowExecutionId: string } | { error: unknown }
  ): void {
    const target = `action policy [id=${policyId}] to workflow [id=${workflowId}]`;
    try {
      this.coreSecurity.audit.asScoped(this.request).log({
        message:
          'error' in outcome
            ? `User failed to send a test notification of ${target}`
            : `User sent a test notification of ${target} [executionId=${outcome.workflowExecutionId}]`,
        event: {
          action: TEST_SEND_AUDIT_ACTION,
          category: ['database'],
          type: ['change'],
          outcome: 'error' in outcome ? 'failure' : 'success',
        },
        kibana: {
          space_id: this.spaceId,
          saved_object: { type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: policyId },
        },
        ...('error' in outcome
          ? { error: { code: 'Error', message: toErrorMessage(outcome.error) } }
          : {}),
      });
    } catch (error) {
      this.logger.warn({
        message: 'Failed to write the audit record of a test notification',
        error,
        code: ALERTING_LOG_CODES.ACTION_POLICY_TEST_AUDIT_FAILED,
        labels: { policy_id: policyId, workflow_id: workflowId, space_id: this.spaceId },
      });
    }
  }

  private reportSent(
    policy: ActionPolicyResponse,
    payload: ActionPolicyWorkflowPayload,
    results: ActionPolicyTestSendResult[]
  ): void {
    const failedCount = results.filter((result) => 'error' in result).length;
    this.ebtService.reportEvent(ACTION_POLICY_TEST_SENT_EBT_EVENT_TYPE, {
      action_policy_id: policy.id,
      space_id: this.spaceId,
      grouping_mode: (policy.grouping ?? DEFAULT_GROUPING).mode,
      matcher_type: getMatcherType(policy),
      alert_count: payload.alerts.length,
      destination_count: results.length,
      started_count: results.length - failedCount,
      failed_count: failedCount,
    });
  }
}
