/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import {
  RULE_EXECUTIONS_MAX_PER_PAGE,
  type GetRuleExecutionsQuery,
  type GetRuleExecutionsResponse,
} from '@kbn/alerting-v2-schemas';
import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';
import { EventLogServiceToken } from '../services/event_log_service/tokens';
import type { EventLogServiceContract } from '../services/event_log_service/event_log_service';
import { RulesClient } from '../rules_client';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { ALERTING_V2_LOG_CODES } from '../errors/error_codes';
import type { ExecutionHistoryClientContract } from './types';

/**
 * Upper bound for the rule-name lookup on a single page. Matches the page's
 * max distinct-rule-id count, since each execution event references exactly
 * one rule.
 */
const MAX_RULES_PER_LOOKUP = RULE_EXECUTIONS_MAX_PER_PAGE;

@injectable()
export class ExecutionHistoryClient implements ExecutionHistoryClientContract {
  constructor(
    @inject(EventLogServiceToken) private readonly eventLog: EventLogServiceContract,
    @inject(RulesClient) private readonly rulesClient: RulesClient,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async getRuleExecutions(
    query: GetRuleExecutionsQuery
  ): Promise<GetRuleExecutionsResponse> {
    const { ruleId: ruleIds, outcome: outcomes, from, to, sort, sortOrder, page, perPage } = query;

    const results = await this.eventLog.findRuleExecutions({
      spaceId: this.spaceId,
      ruleIds,
      outcomes,
      from,
      to,
      sort,
      sortOrder,
      page,
      perPage,
    });

    const ruleNamesById = await this.resolveRuleNames(
      Array.from(new Set(results.items.map((item) => item.rule.id)))
    );

    return {
      ...results,
      items: results.items.map((item) => ({
        ...item,
        rule: { ...item.rule, name: ruleNamesById.get(item.rule.id) ?? null },
      })),
    };
  }

  /**
   * Best-effort rule-name resolution. Uses `findRules` rather than a direct
   * SO `bulkGet` so deleted rules (or rules the caller can't read) are simply
   * absent from the result instead of raising a 404/403. The execution
   * history view still renders the row with `rule.name: null`.
   */
  private async resolveRuleNames(ruleIds: string[]): Promise<Map<string, string | null>> {
    if (ruleIds.length === 0) return new Map();

    try {
      const cappedRuleIds = ruleIds.slice(0, MAX_RULES_PER_LOOKUP);
      const { items } = await this.rulesClient.findRules({
        filter: buildRuleIdsFilter(cappedRuleIds),
        perPage: MAX_RULES_PER_LOOKUP,
      });

      return new Map(items.map((rule) => [rule.id, rule.metadata.name]));
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error : new Error(String(error)),
        code: ALERTING_V2_LOG_CODES.EXECUTION_HISTORY_RULE_NAME_LOOKUP_FAILED,
      });

      return new Map();
    }
  }
}

const buildRuleIdsFilter = (ids: string[]): string =>
  toKqlExpression(
    nodeBuilder.or(ids.map((id) => nodeBuilder.is('id', nodeTypes.literal.buildNode(id, true))))
  );
