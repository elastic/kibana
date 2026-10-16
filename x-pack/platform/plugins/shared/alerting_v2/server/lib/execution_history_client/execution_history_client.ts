/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ruleIdSchema } from '@kbn/alerting-v2-schemas';
import { RulesClient } from '../rules_client';
import { EventLogServiceToken } from '../services/event_log_service/tokens';
import type { EventLogServiceContract } from '../services/event_log_service/event_log_service';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import type {
  ExecutionHistoryClientContract,
  ListRuleExecutionsArgs,
  ListRuleExecutionsResult,
  RuleSearchMatches,
} from './types';

const SEARCH_ID_CAP = 500;

interface ResolvedSearch {
  ruleIds: string[];
  matches: RuleSearchMatches;
}

@injectable()
export class ExecutionHistoryClient implements ExecutionHistoryClientContract {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(EventLogServiceToken) private readonly eventLog: EventLogServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(RulesClient) private readonly rulesClient: RulesClient,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('executionHistory');
  }

  public async listRuleExecutions({
    search,
    ...args
  }: ListRuleExecutionsArgs): Promise<ListRuleExecutionsResult> {
    if (search === undefined) {
      const result = await this.eventLog.findRuleExecutions({ spaceId: this.spaceId, ...args });
      return { ...result, searchMatches: null };
    }

    const { ruleIds, page, perPage } = args;
    const resolved = await this.resolveSearch(search);
    const matchingRuleIds = ruleIds
      ? resolved.ruleIds.filter((id) => ruleIds.includes(id))
      : resolved.ruleIds;

    if (matchingRuleIds.length === 0) {
      return { items: [], total: 0, page, perPage, searchMatches: resolved.matches };
    }

    const result = await this.eventLog.findRuleExecutions({
      spaceId: this.spaceId,
      ...args,
      ruleIds: matchingRuleIds,
    });
    return { ...result, searchMatches: resolved.matches };
  }

  private async resolveSearch(search: string): Promise<ResolvedSearch> {
    const ruleIds = new Set<string>();
    let total = 0;

    try {
      const response = await this.rulesClient.findRules({ search, perPage: SEARCH_ID_CAP });
      response.items.forEach(({ id }) => ruleIds.add(id));
      total = response.total;
    } catch (error) {
      // Readers without rules access can still search by exact rule id; anything else is a real failure.
      if (!SavedObjectsErrorHelpers.isForbiddenError(error)) {
        throw error;
      }
      this.logger.warn({
        message: 'Execution history lookup failed',
        error,
        code: ALERTING_LOG_CODES.EXECUTION_HISTORY_SEARCH_RULE_LOOKUP_FAILED,
      });
    }

    // The name lookup can't find a rule by its id, and callers may supply custom ids like `cpu-prod`.
    if (ruleIdSchema.safeParse(search).success) {
      ruleIds.add(search);
    }

    return {
      ruleIds: [...ruleIds],
      matches: { rules: total, isTruncated: total > SEARCH_ID_CAP },
    };
  }
}
