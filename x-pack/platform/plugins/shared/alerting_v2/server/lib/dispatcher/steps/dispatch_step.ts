/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Headers, FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { inject, injectable } from 'inversify';
import { get } from 'lodash';
import pLimit from 'p-limit';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type {
  AlertEpisode,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  NotificationGroup,
  NotificationPolicyId,
  NotificationPolicy,
  NotificationPolicyWorkflowPayload,
  Rule,
  RuleId,
} from '../types';
import { KibanaBaseUrlToken, WorkflowsManagementApiToken } from './dispatch_step_tokens';

const NOTIFICATION_POLICY_TRIGGER = 'notification_policy';
const MAX_CONCURRENT_DISPATCHES = 3;

@injectable()
export class DispatchStep implements DispatcherStep {
  public readonly name = 'dispatch';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsServerPluginSetup['management'],
    @inject(KibanaBaseUrlToken) private readonly kibanaBaseUrl: string | undefined
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatch = [], policies, rules } = state;

    const limiter = pLimit(MAX_CONCURRENT_DISPATCHES);

    await Promise.allSettled(
      dispatch.map((group) => limiter(() => this.dispatchGroup(group, policies, rules)))
    );

    return { type: 'continue' };
  }

  private async dispatchGroup(
    group: NotificationGroup,
    policies?: Map<NotificationPolicyId, NotificationPolicy>,
    rules?: ReadonlyMap<RuleId, Rule>
  ): Promise<void> {
    try {
      const policy = policies?.get(group.policyId);
      const apiKey = policy?.apiKey;

      if (!apiKey) {
        this.logger.warn({
          message: () =>
            `No API key found for policy ${group.policyId}, skipping dispatch of group ${group.id}`,
        });
        return;
      }

      const fakeRequest = this.craftFakeRequest(apiKey);

      for (const destination of group.destinations) {
        if (destination.type !== 'workflow') {
          continue;
        }

        try {
          await this.dispatchWorkflow(group, destination.id, fakeRequest, rules, policy);
        } catch (err) {
          this.logger.error({
            error:
              err instanceof Error
                ? err
                : new Error(
                    `Failed to dispatch group ${group.id} to workflow ${destination.id}: ${String(
                      err
                    )}`
                  ),
          });
        }
      }
    } catch (err) {
      this.logger.error({
        error:
          err instanceof Error
            ? err
            : new Error(
                `Failed to dispatch group ${group.id} for policy ${group.policyId}: ${String(err)}`
              ),
      });
    }
  }

  private craftFakeRequest(apiKey: string): KibanaRequest {
    const requestHeaders: Headers = {
      authorization: `ApiKey ${apiKey}`,
    };

    const fakeRawRequest: FakeRawRequest = {
      headers: requestHeaders,
      path: '/',
    };

    return kibanaRequestFactory(fakeRawRequest);
  }

  private buildKibanaUrl(path: string): string | undefined {
    if (!this.kibanaBaseUrl) return undefined;
    return `${this.kibanaBaseUrl}${path}`;
  }

  private extractGroupValues(
    episode: AlertEpisode,
    rule?: Rule
  ): Record<string, unknown> | undefined {
    const fields = rule?.groupingFields;
    if (!fields || fields.length === 0 || !episode.data) return undefined;
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      const value = get(episode.data, field);
      if (value !== undefined) {
        values[field] = value;
      }
    }
    return Object.keys(values).length > 0 ? values : undefined;
  }

  private enrichEpisodes(
    episodes: AlertEpisode[],
    rules?: ReadonlyMap<RuleId, Rule>
  ): AlertEpisode[] {
    return episodes.map((episode) => {
      const rule = rules?.get(episode.rule_id);
      return {
        ...episode,
        ...(rule ? { rule_name: rule.name } : {}),
        rule_url: this.buildKibanaUrl(`/app/management/alertingV2/rules/${encodeURIComponent(episode.rule_id)}`),
        group_values: this.extractGroupValues(episode, rule),
        episode_url: this.buildKibanaUrl(`/app/management/alertingV2/episodes/${encodeURIComponent(episode.episode_id)}`),
      };
    });
  }

  private async dispatchWorkflow(
    group: NotificationGroup,
    workflowId: string,
    request: KibanaRequest,
    rules?: ReadonlyMap<RuleId, Rule>,
    policy?: NotificationPolicy
  ): Promise<void> {
    const workflow = await this.workflowsManagement.getWorkflow(workflowId, group.spaceId);

    if (!workflow) {
      this.logger.warn({
        message: () => `Workflow ${workflowId} not found, skipping dispatch for group ${group.id}`,
      });
      return;
    }

    if (!workflow.enabled) {
      this.logger.warn({
        message: () =>
          `Workflow ${workflowId} is disabled, enable it to dispatch for group ${group.id}`,
      });
      return;
    }

    const model: WorkflowExecutionEngineModel = {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition ?? undefined,
      yaml: workflow.yaml,
    };

    const policyUrl = this.buildKibanaUrl(`/app/management/alertingV2/notification_policies/edit/${encodeURIComponent(group.policyId)}`);
    const workflowUrl = this.buildKibanaUrl(`/app/workflows/${encodeURIComponent(workflowId)}`);

    const payload: NotificationPolicyWorkflowPayload = {
      id: group.id,
      policyId: group.policyId,
      policyName: policy?.name ?? group.policyId,
      policyUrl,
      groupingMode: policy?.groupingMode ?? 'per_episode',
      workflowName: workflow.name,
      workflowUrl,
      groupKey: group.groupKey,
      episodes: this.enrichEpisodes(group.episodes, rules),
    };

    this.logger.debug({
      message: () =>
        `Dispatching notification group ${group.id} to workflow ${workflowId} for policy ${group.policyId}`,
    });

    const executionId = await this.workflowsManagement.scheduleWorkflow(
      model,
      group.spaceId,
      payload,
      request,
      NOTIFICATION_POLICY_TRIGGER
    );

    this.logger.debug({
      message: () =>
        `Workflow ${workflowId} execution scheduled with id ${executionId} for group ${group.id}`,
    });
  }
}
