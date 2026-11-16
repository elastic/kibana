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
  type ActionPolicyTestPreviewParams,
  type ActionPolicyTestPreviewResponse,
  type ActionPolicyTestSendResponse,
  type ActionPolicyTestSendResult,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { inject, injectable } from 'inversify';
import { isError } from 'lodash';
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
import { PrivilegeChecker } from '../services/privilege_checker/privilege_checker';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import { getMatcherType } from '../telemetry/action_policy_ebt_event';
import { ACTION_POLICY_TEST_SENT_EBT_EVENT_TYPE } from '../telemetry/action_policy_test_ebt_event';
import { buildTestScenario } from './test_scenario_builder';

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
    @inject(PrivilegeChecker) private readonly privilegeChecker: PrivilegeChecker,
    @inject(KibanaBaseUrlToken) private readonly kibanaBaseUrl: string,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('actionPolicyTest');
  }

  public async preview({
    policyId,
    seed = createSeed(),
  }: ActionPolicyTestPreviewParams): Promise<ActionPolicyTestPreviewResponse> {
    await this.licenseService.assertActionPoliciesLicense();
    const [policy, workflowPrivileges] = await Promise.all([
      this.actionPolicyClient.getActionPolicy({ id: policyId }),
      this.privilegeChecker.getWorkflowPrivileges(),
    ]);
    const groups = this.buildScenario(policy, seed);
    const destinations = await this.describeDestinations(policy, workflowPrivileges);

    return { seed, groups: groups.map((payload) => ({ ...payload })), destinations };
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

    const [payload] = this.buildScenario(policy, seed);
    const results = await Promise.all(
      workflowIds.map((workflowId) => this.runWorkflowTest(policyId, workflowId, payload))
    );

    this.reportSent(policy, payload, results);

    return { results };
  }

  private buildScenario(policy: ActionPolicyResponse, seed: number): ActionPolicyWorkflowPayload[] {
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
   * Destination metadata for the current user. A destination is executable when the user may run
   * workflows and the workflow's access control allows it. Workflows are only read when the user
   * may read workflows; otherwise each destination is reported without its name.
   */
  private async describeDestinations(
    policy: ActionPolicyResponse,
    { read, execute }: { read: boolean; execute: boolean }
  ): Promise<ActionPolicyTestDestination[]> {
    const ids = getWorkflowDestinationIds(policy);
    if (ids.length === 0) {
      return [];
    }

    if (!read) {
      return ids.map((id) => ({ id, executable: execute }));
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
        executable: execute && workflow.permissions?.execute !== false,
      };
    });
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
      return { workflow_id: workflowId, workflow_execution_id: workflowExecutionId };
    } catch (error) {
      this.logger.warn({
        message: 'Failed to start the workflow test run of a test notification',
        error,
        code: ALERTING_LOG_CODES.ACTION_POLICY_TEST_RUN_FAILED,
        labels: { policy_id: policyId, workflow_id: workflowId, space_id: this.spaceId },
      });
      return { workflow_id: workflowId, error: toErrorMessage(error) };
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
      failed_count: failedCount,
    });
  }
}
