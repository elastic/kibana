/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import type { KibanaRequest } from '@kbn/core/server';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  MAX_BULK_ITEMS,
  POLICY_EXECUTION_HISTORY_MAX_PER_PAGE,
  type PolicyExecutionHistoryItem,
  type RuleResponse,
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
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

const TIME_WINDOW_HOURS = 24;
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = POLICY_EXECUTION_HISTORY_MAX_PER_PAGE;
const MAX_CONCURRENT_RULE_LOOKUPS = 5;

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
      this.lookupRulesByIds(ruleIds),
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

  private async lookupRulesByIds(ruleIds: string[]): Promise<RuleResponse[]> {
    if (ruleIds.length === 0) return [];

    const idChunks = chunk(ruleIds, MAX_BULK_ITEMS);
    const limiter = pLimit(MAX_CONCURRENT_RULE_LOOKUPS);

    const responses = await Promise.all(
      idChunks.map((idChunk) =>
        limiter(() =>
          this.rulesClient.findRules({
            filter: this.buildRuleIdsFilter(idChunk),
            perPage: idChunk.length,
          })
        )
      )
    );

    return responses.flatMap((response) => response.items);
  }

  private buildRuleIdsFilter(ids: string[]): string {
    return toKqlExpression(
      nodeBuilder.or(
        ids.map((id) =>
          nodeBuilder.is(
            'id',
            nodeTypes.literal.buildNode(this.toSavedObjectIdFilterValue(id), true)
          )
        )
      )
    );
  }

  private toSavedObjectIdFilterValue(ruleId: string): string {
    return ruleId.startsWith(`${RULE_SAVED_OBJECT_TYPE}:`)
      ? ruleId
      : `${RULE_SAVED_OBJECT_TYPE}:${ruleId}`;
  }
}
