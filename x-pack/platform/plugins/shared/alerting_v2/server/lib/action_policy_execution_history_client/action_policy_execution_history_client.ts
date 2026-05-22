/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import type { KibanaRequest } from '@kbn/core/server';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  POLICY_EXECUTION_HISTORY_MAX_PER_PAGE,
  type PolicyExecutionHistoryItem,
} from '@kbn/alerting-v2-schemas';
import { ActionPolicyClient } from '../action_policy_client';
import { RulesClient } from '../rules_client';
import { WorkflowsManagementApiToken } from '../dispatcher/steps/dispatch_step_tokens';
import { EventLogServiceToken } from '../services/event_log_service/tokens';
import type { EventLogServiceContract } from '../services/event_log_service/event_log_service';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type { AlertingServerStartDependencies } from '../../types';
import { collectIdsFromEvents, denormalizeEvent, type NameMaps } from './denormalize_event';

const TIME_WINDOW_HOURS = 24;
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = POLICY_EXECUTION_HISTORY_MAX_PER_PAGE;

export interface ListExecutionHistoryParams {
  request: KibanaRequest;
  page?: number;
  perPage?: number;
}

export interface ListExecutionHistoryResult {
  items: PolicyExecutionHistoryItem[];
  page: number;
  perPage: number;
  totalEvents: number;
}

export interface CountNewEventsSinceParams {
  request: KibanaRequest;
  since: string;
}

export interface CountNewEventsSinceResult {
  count: number;
}

@injectable()
export class ActionPolicyExecutionHistoryClient {
  constructor(
    @inject(EventLogServiceToken) private readonly eventLogService: EventLogServiceContract,
    @inject(ActionPolicyClient) private readonly actionPolicyClient: ActionPolicyClient,
    @inject(RulesClient) private readonly rulesClient: RulesClient,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsServerPluginSetup['management'],
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: AlertingServerStartDependencies['spaces'],
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async listExecutionHistory({
    request,
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PER_PAGE,
  }: ListExecutionHistoryParams): Promise<ListExecutionHistoryResult> {
    const startDate = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const spaceId = this.spaces.spacesService.getSpaceId(request);

    const result = await this.eventLogService.findActionPolicyExecutionEvents({
      request,
      spaceId,
      startDate,
      page,
      perPage,
    });

    const nameMaps = await this.resolveNames(result.events, spaceId);
    const items = result.events.flatMap((event) => denormalizeEvent(event, nameMaps));

    return {
      items,
      page: result.page,
      perPage: result.perPage,
      totalEvents: result.total,
    };
  }

  public async countNewEventsSince({
    request,
    since,
  }: CountNewEventsSinceParams): Promise<CountNewEventsSinceResult> {
    const spaceId = this.spaces.spacesService.getSpaceId(request);
    return this.eventLogService.countActionPolicyExecutionEventsSince({
      request,
      spaceId,
      since,
    });
  }

  private async resolveNames(events: IValidatedEvent[], spaceId: string): Promise<NameMaps> {
    const { policyIds, ruleIds, workflowIds } = collectIdsFromEvents(events);

    const [policiesRes, rulesRes, workflowsRes] = await Promise.allSettled([
      this.actionPolicyClient.getActionPolicies({ ids: policyIds }),
      this.rulesClient.getRules(ruleIds),
      this.workflowsManagement.getWorkflowsByIds(workflowIds, spaceId),
    ]);

    const policies = this.unwrap(policiesRes, 'EXECUTION_HISTORY_POLICY_LOOKUP_FAILED');
    const rules = this.unwrap(rulesRes, 'EXECUTION_HISTORY_RULE_LOOKUP_FAILED');
    const workflows = this.unwrap(workflowsRes, 'EXECUTION_HISTORY_WORKFLOW_LOOKUP_FAILED');

    return {
      policyNames: new Map(policies.map((p) => [p.id, p.name])),
      ruleNames: new Map(rules.map((r) => [r.id, r.metadata.name])),
      workflowNames: new Map(workflows.map((w) => [w.id, w.name])),
    };
  }

  private unwrap<T>(result: PromiseSettledResult<T[]>, code: string): T[] {
    if (result.status === 'fulfilled') return result.value;
    const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
    this.logger.error({ error, code });
    return [];
  }
}
