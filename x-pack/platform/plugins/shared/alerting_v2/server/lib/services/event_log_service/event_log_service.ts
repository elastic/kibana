/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { PluginSetup } from '@kbn/core-di';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  IEvent,
  IEventLogger,
  IEventLogService,
  IValidatedEvent,
} from '@kbn/event-log-plugin/server';
import type { PolicyExecutionOutcome } from '@kbn/alerting-v2-schemas';
import type { AlertingServerSetupDependencies } from '../../../types';
import { EsServiceInternalToken } from '../es_service/tokens';
import { EventLoggerToken } from './tokens';
import {
  buildCountActionPolicyEventsQuery,
  buildFindActionPolicyEventsQuery,
} from './queries/action_policy_events_query';
import { buildRuleExecutionsQuery } from './queries/rule_executions_query';
import { normalizeRuleExecution } from './normalizers/rule_execution_normalizer';
import type { FindRuleExecutionsQuery, PaginatedResult, RuleExecution } from './types';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE = 1;

export interface FindActionPolicyExecutionEventsParams {
  spaceId: string;
  startDate: string;
  page?: number;
  perPage?: number;
  outcome?: PolicyExecutionOutcome;
  policyIds?: string[];
  ruleIds?: string[];
}

export interface FindActionPolicyExecutionEventsResult {
  events: IValidatedEvent[];
  page: number;
  perPage: number;
  total: number;
}

export interface CountActionPolicyExecutionEventsSinceParams {
  spaceId: string;
  since: string;
  outcome?: PolicyExecutionOutcome;
  policyIds?: string[];
  ruleIds?: string[];
}

export interface CountActionPolicyExecutionEventsSinceResult {
  count: number;
}

export interface EventLogServiceContract {
  logEvent(event: IEvent, id?: string): void;
  findActionPolicyExecutionEvents(
    params: FindActionPolicyExecutionEventsParams
  ): Promise<FindActionPolicyExecutionEventsResult>;
  countActionPolicyExecutionEventsSince(
    params: CountActionPolicyExecutionEventsSinceParams
  ): Promise<CountActionPolicyExecutionEventsSinceResult>;
  findRuleExecutions(query: FindRuleExecutionsQuery): Promise<PaginatedResult<RuleExecution>>;
}

@injectable()
export class EventLogService implements EventLogServiceContract {
  constructor(
    @inject(EventLoggerToken) private readonly eventLogger: IEventLogger,
    @inject(PluginSetup<AlertingServerSetupDependencies['eventLog']>('eventLog'))
    private readonly eventLogService: IEventLogService,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient
  ) {}

  public logEvent(event: IEvent, id?: string): void {
    this.eventLogger.logEvent(event, id);
  }

  public async findActionPolicyExecutionEvents({
    spaceId,
    startDate,
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PAGE_SIZE,
    outcome,
    policyIds,
    ruleIds,
  }: FindActionPolicyExecutionEventsParams): Promise<FindActionPolicyExecutionEventsResult> {
    const body = buildFindActionPolicyEventsQuery({
      spaceId,
      startDate,
      outcome,
      policyIds,
      ruleIds,
      page,
      perPage,
    });
    const index = this.eventLogService.getIndexPattern();

    const response = await this.esClient.search<IValidatedEvent>({ index, ...body });

    const events = response.hits.hits.map((hit) => hit._source as IValidatedEvent);

    return {
      events,
      page,
      perPage,
      total: extractTotal(response.hits.total),
    };
  }

  public async countActionPolicyExecutionEventsSince({
    spaceId,
    since,
    outcome,
    policyIds,
    ruleIds,
  }: CountActionPolicyExecutionEventsSinceParams): Promise<CountActionPolicyExecutionEventsSinceResult> {
    const body = buildCountActionPolicyEventsQuery({
      spaceId,
      startDate: since,
      outcome,
      policyIds,
      ruleIds,
    });
    const index = this.eventLogService.getIndexPattern();

    const response = await this.esClient.search<IValidatedEvent>({ index, ...body });

    return { count: extractTotal(response.hits.total) };
  }

  /**
   * Reads `task-run` events for alerting_v2 rule executor tasks from the
   * event log service.
   *
   * Implementation goes directly against ES with the index pattern resolved
   * from {@link IEventLogService.getIndexPattern} so we adapt to event-log
   * index versioning automatically.
   */
  public async findRuleExecutions(
    query: FindRuleExecutionsQuery
  ): Promise<PaginatedResult<RuleExecution>> {
    const index = this.eventLogService.getIndexPattern();
    const body = buildRuleExecutionsQuery(query);

    const response = await this.esClient.search<IValidatedEvent>({ index, ...body });

    const items: RuleExecution[] = [];
    for (const hit of response.hits.hits) {
      const normalized = normalizeRuleExecution(hit._id, hit._source as IValidatedEvent);
      if (normalized !== null) {
        items.push(normalized);
      }
    }

    return {
      items,
      total: extractTotal(response.hits.total),
      page: query.page,
      perPage: query.perPage,
    };
  }
}

/**
 * Reads either the plain number (legacy clients) or the `{ value, relation }`
 * object that ES returns under `hits.total`. When `track_total_hits` is left
 * to its default, the relation may be `gte` with a capped value; we surface
 * that capped number unchanged.
 */
const extractTotal = (
  total: number | { value: number; relation?: 'eq' | 'gte' } | undefined
): number => {
  if (typeof total === 'number') return total;
  return total?.value ?? 0;
};
