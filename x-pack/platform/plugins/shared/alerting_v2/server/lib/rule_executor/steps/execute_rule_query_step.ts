/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { getQueryPayload } from '../get_query_payload';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import {
  QueryService,
  type QueryServiceContract,
} from '../../services/query_service/query_service';

@injectable()
export class ExecuteRuleQueryStep implements RuleExecutionStep {
  public readonly name = 'execute_rule_query';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryService) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { rule, input } = state;

    if (!rule) {
      throw new Error('ExecuteRuleQueryStep requires rule from previous step');
    }

    const queryPayload = getQueryPayload({
      query: rule.query,
      timeField: rule.timeField,
      lookbackWindow: rule.lookbackWindow,
    });

    this.logger.debug({
      message: () =>
        `build ES|QL query for rule ${input.ruleId} in space ${input.spaceId} - ${JSON.stringify({
          query: rule.query,
          filter: queryPayload.filter,
          params: queryPayload.params,
        })}`,
    });

    let esqlResponse;

    try {
      esqlResponse = await this.queryService.executeQuery({
        query: rule.query,
        filter: queryPayload.filter,
        params: queryPayload.params,
        abortSignal: input.abortSignal,
      });
    } catch (error) {
      if (input.abortSignal.aborted) {
        throw new Error('Search has been aborted due to cancelled execution');
      }

      throw error;
    }

    return { type: 'continue', data: { queryPayload, esqlResponse } };
  }
}
