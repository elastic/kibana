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
  type PolicyExecutionOutcome,
  type PolicyExecutionOutcomeFilter,
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
const SEARCH_ID_CAP = 500;
const DEFAULT_OUTCOME_FILTER: PolicyExecutionOutcomeFilter = 'all';

export interface ListExecutionHistoryParams {
  request: KibanaRequest;
  page?: number;
  perPage?: number;
  search?: string;
  outcome?: PolicyExecutionOutcomeFilter;
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
  search?: string;
  outcome?: PolicyExecutionOutcomeFilter;
}

export interface CountNewEventsSinceResult {
  count: number;
}

interface ResolvedSearchIds {
  policyIds: string[];
  ruleIds: string[];
  hasMatches: boolean;
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
    search,
    outcome = DEFAULT_OUTCOME_FILTER,
  }: ListExecutionHistoryParams): Promise<ListExecutionHistoryResult> {
    const startDate = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const spaceId = this.spaces.spacesService.getSpaceId(request);

    const searchIds = await this.resolveSearchIds(search);


    if (search !== undefined && !searchIds.hasMatches) {
      return { items: [], page, perPage, totalEvents: 0 };
    }

    console.log({
      request,
      spaceId,
      startDate,
      page,
      perPage,
      outcome: toOutcomeForService(outcome),
      policyIds: searchIds.policyIds,
      ruleIds: searchIds.ruleIds,
    });
    const result = await this.eventLogService.findActionPolicyExecutionEvents({
      request,
      spaceId,
      startDate,
      page,
      perPage,
      outcome: toOutcomeForService(outcome),
      policyIds: searchIds.policyIds,
      ruleIds: searchIds.ruleIds,
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
    search,
    outcome = DEFAULT_OUTCOME_FILTER,
  }: CountNewEventsSinceParams): Promise<CountNewEventsSinceResult> {
    const spaceId = this.spaces.spacesService.getSpaceId(request);

    const searchIds = await this.resolveSearchIds(search);
    if (search !== undefined && !searchIds.hasMatches) {
      return { count: 0 };
    }

    return this.eventLogService.countActionPolicyExecutionEventsSince({
      request,
      spaceId,
      since,
      outcome: toOutcomeForService(outcome),
      policyIds: searchIds.policyIds,
      ruleIds: searchIds.ruleIds,
    });
  }

  private async resolveSearchIds(search: string | undefined): Promise<ResolvedSearchIds> {
    if (!search) return { policyIds: [], ruleIds: [], hasMatches: true };

    const [policiesRes, rulesRes] = await Promise.allSettled([
      this.actionPolicyClient.findActionPolicies({ search, perPage: SEARCH_ID_CAP }),
      this.rulesClient.findRules({ search, perPage: SEARCH_ID_CAP }),
    ]);

    const policyIds = new Set<string>(
      this.unwrapItems(policiesRes, 'EXECUTION_HISTORY_SEARCH_POLICY_LOOKUP_FAILED').map(
        (p) => p.id
      )
    );
    const ruleIds = new Set<string>(
      this.unwrapItems(rulesRes, 'EXECUTION_HISTORY_SEARCH_RULE_LOOKUP_FAILED').map((r) => r.id)
    );

    if (looksLikeSavedObjectId(search)) {
      policyIds.add(search);
      ruleIds.add(search);
    }

    return {
      policyIds: [...policyIds],
      ruleIds: [...ruleIds],
      hasMatches: policyIds.size > 0 || ruleIds.size > 0,
    };
  }

  private async resolveNames(events: IValidatedEvent[], spaceId: string): Promise<NameMaps> {
    const { policyIds, ruleIds, workflowIds } = collectIdsFromEvents(events);

    const [policiesRes, rulesRes, workflowsRes] = await Promise.allSettled([
      this.actionPolicyClient.getActionPolicies({ ids: policyIds }),
      this.rulesClient.getRules(ruleIds),
      this.workflowsManagement.getWorkflowsByIds(workflowIds, spaceId),
    ]);

    const policies = this.unwrapArray(policiesRes, 'EXECUTION_HISTORY_POLICY_LOOKUP_FAILED');
    const rules = this.unwrapArray(rulesRes, 'EXECUTION_HISTORY_RULE_LOOKUP_FAILED');
    const workflows = this.unwrapArray(workflowsRes, 'EXECUTION_HISTORY_WORKFLOW_LOOKUP_FAILED');

    return {
      policyNames: new Map(policies.map((p) => [p.id, p.name])),
      ruleNames: new Map(rules.map((r) => [r.id, r.metadata.name])),
      workflowNames: new Map(workflows.map((w) => [w.id, w.name])),
    };
  }

  private unwrapArray<T>(result: PromiseSettledResult<T[]>, code: string): T[] {
    if (result.status === 'fulfilled') return result.value;
    this.logFailure(result.reason, code);
    return [];
  }

  private unwrapItems<T>(result: PromiseSettledResult<{ items: T[] }>, code: string): T[] {
    if (result.status === 'fulfilled') return result.value.items;
    this.logFailure(result.reason, code);
    return [];
  }

  private logFailure(reason: unknown, code: string): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    this.logger.error({ error, code });
  }
}

const toOutcomeForService = (
  outcome: PolicyExecutionOutcomeFilter
): PolicyExecutionOutcome | undefined => (outcome === 'all' ? undefined : outcome);

const SO_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const looksLikeSavedObjectId = (value: string): boolean => SO_ID_PATTERN.test(value);
