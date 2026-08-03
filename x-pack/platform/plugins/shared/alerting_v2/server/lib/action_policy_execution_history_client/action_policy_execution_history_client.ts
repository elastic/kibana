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
import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  EXECUTION_HISTORY_DEFAULT_PER_PAGE,
  type PolicyExecutionHistoryItem,
  type RuleResponse,
  type PolicyExecutionOutcomeFilter,
  type SearchMatchCounts,
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
import { ALERTING_V2_LOG_CODES, type AlertingV2LogCode } from '../errors/error_codes';
import type { AlertingServerStartDependencies } from '../../types';
import type { ResolvedSearchIds } from './build_execution_history_item';
import {
  collectIdsFromEvents,
  buildExecutionHistoryItem,
  type NameMaps,
} from './build_execution_history_item';

// Default lower bound on the event timestamp when the caller does not pass an
// explicit `start_date`.
const DEFAULT_TIME_WINDOW_HOURS = 24;

// Pagination defaults applied when the caller omits them
const DEFAULT_PAGE = 1;

const SEARCH_ID_CAP = 500;

// Cap the per-page name-lookup batch.
const MAX_RULES_PER_NAME_LOOKUP = 1000;

export interface ListExecutionHistoryArgs {
  request: KibanaRequest;
  page?: number;
  perPage?: number;
  search?: string;
  ruleIds?: string[];
  outcome?: PolicyExecutionOutcomeFilter;
  episodeIds?: string[];
  /**
   * Inclusive ISO timestamp lower bound for `@timestamp`. When provided it
   * replaces the default rolling {@link DEFAULT_TIME_WINDOW_HOURS}-hour window.
   */
  startDate?: string;
}

export interface ListExecutionHistoryResult {
  items: PolicyExecutionHistoryItem[];
  page: number;
  perPage: number;
  totalEvents: number;
  searchMatches: SearchMatchCounts | null;
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
    perPage = EXECUTION_HISTORY_DEFAULT_PER_PAGE,
    search,
    ruleIds,
    outcome,
    episodeIds,
    startDate,
  }: ListExecutionHistoryArgs): Promise<ListExecutionHistoryResult> {
    const effectiveStartDate =
      startDate ?? new Date(Date.now() - DEFAULT_TIME_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const spaceId = this.spaces.spacesService.getSpaceId(request);
    const searchIsActive = search !== undefined && search.trim() !== '';

    const matchingSearchIds = await this.resolveSearchIds(search);

    if (searchIsActive && !matchingSearchIds.hasMatches) {
      return {
        items: [],
        page,
        perPage,
        totalEvents: 0,
        searchMatches: matchingSearchIds.matches,
      };
    }

    const result = await this.eventLogService.findActionPolicyExecutionEvents({
      spaceId,
      startDate: effectiveStartDate,
      page,
      perPage,
      outcomes: outcome,
      policyIds: matchingSearchIds.policyIds,
      ruleIds: matchingSearchIds.ruleIds,
      mandatoryRuleIds: ruleIds,
      episodeIds,
    });

    const nameMaps = await this.resolveNames(result.events, spaceId);
    const items = result.events
      .map((event) =>
        buildExecutionHistoryItem(
          event,
          nameMaps,
          searchIsActive ? matchingSearchIds : undefined,
          ruleIds
        )
      )
      .filter((item): item is PolicyExecutionHistoryItem => item !== null);

    return {
      items,
      page: result.page,
      perPage: result.perPage,
      totalEvents: result.total,
      searchMatches: matchingSearchIds.matches,
    };
  }

  private async resolveSearchIds(search: string | undefined): Promise<ResolvedSearchIds> {
    if (!search) return { policyIds: [], ruleIds: [], hasMatches: true, matches: null };

    const [policiesRes, rulesRes] = await Promise.allSettled([
      this.actionPolicyClient.findActionPolicies({ search, perPage: SEARCH_ID_CAP }),
      this.rulesClient.findRules({ search, perPage: SEARCH_ID_CAP }),
    ]);

    const policies = this.unwrapFindResult(
      policiesRes,
      ALERTING_V2_LOG_CODES.EXECUTION_HISTORY_SEARCH_POLICY_LOOKUP_FAILED
    );
    const rules = this.unwrapFindResult(
      rulesRes,
      ALERTING_V2_LOG_CODES.EXECUTION_HISTORY_SEARCH_RULE_LOOKUP_FAILED
    );

    const policyIds = new Set<string>(policies.items.map((p) => p.id));
    const ruleIds = new Set<string>(rules.items.map((r) => r.id));

    if (looksLikeSavedObjectId(search)) {
      policyIds.add(search);
      ruleIds.add(search);
    }

    return {
      policyIds: [...policyIds],
      ruleIds: [...ruleIds],
      hasMatches: policyIds.size > 0 || ruleIds.size > 0,
      matches: { policies: policies.total, rules: rules.total, cap: SEARCH_ID_CAP },
    };
  }

  private async resolveNames(events: IValidatedEvent[], spaceId: string): Promise<NameMaps> {
    const { policyIds, ruleIds, workflowIds } = collectIdsFromEvents(events);

    const [policiesRes, rulesRes, workflowsRes] = await Promise.allSettled([
      this.actionPolicyClient.getActionPolicies({ ids: policyIds }),
      this.lookupRulesByIds(ruleIds),
      this.workflowsManagement.getWorkflowsByIds(workflowIds, spaceId),
    ]);

    const policies = this.unwrapArray(
      policiesRes,
      ALERTING_V2_LOG_CODES.EXECUTION_HISTORY_POLICY_LOOKUP_FAILED
    );
    const rules = this.unwrapArray(
      rulesRes,
      ALERTING_V2_LOG_CODES.EXECUTION_HISTORY_RULE_LOOKUP_FAILED
    );
    const workflows = this.unwrapArray(
      workflowsRes,
      ALERTING_V2_LOG_CODES.EXECUTION_HISTORY_WORKFLOW_LOOKUP_FAILED
    );

    return {
      policyNames: new Map(policies.map((p) => [p.id, p.name])),
      ruleNames: new Map(rules.map((r) => [r.id, r.metadata.name])),
      workflowNames: new Map(workflows.map((w) => [w.id, w.name])),
    };
  }

  private unwrapArray<T>(result: PromiseSettledResult<T[]>, code: AlertingV2LogCode): T[] {
    if (result.status === 'fulfilled') return result.value;
    this.logger.error({ error: result.reason, code });
    return [];
  }

  private async lookupRulesByIds(ruleIds: string[]): Promise<RuleResponse[]> {
    if (ruleIds.length === 0) return [];

    const cappedRuleIds = ruleIds.slice(0, MAX_RULES_PER_NAME_LOOKUP);

    const response = await this.rulesClient.findRules({
      filter: this.buildRuleIdsFilter(cappedRuleIds),
      perPage: MAX_RULES_PER_NAME_LOOKUP,
    });

    return response.items;
  }

  private buildRuleIdsFilter(ids: string[]): string {
    return toKqlExpression(
      nodeBuilder.or(ids.map((id) => nodeBuilder.is('id', nodeTypes.literal.buildNode(id, true))))
    );
  }

  private unwrapFindResult<T>(
    result: PromiseSettledResult<{ items: T[]; total: number }>,
    code: AlertingV2LogCode
  ): { items: T[]; total: number } {
    if (result.status === 'fulfilled') return result.value;
    this.logger.error({ error: result.reason, code });
    return { items: [], total: 0 };
  }
}

// Only treat the search term as a candidate id when it looks like a UUID — Kibana saved
// objects created via the API use UUIDs by default. Avoids polluting the KQL with ordinary
// words like "rule" or "cpu" that would otherwise be added as candidate ids.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikeSavedObjectId = (value: string): boolean => UUID_PATTERN.test(value);
