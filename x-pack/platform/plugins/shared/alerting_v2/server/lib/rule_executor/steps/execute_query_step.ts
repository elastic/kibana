/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { continueWith } from '../types';
import {
  QueryService,
  type QueryServiceContract,
} from '../../services/query_service/query_service';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class ExecuteQueryStep implements RuleExecutionStep {
  public readonly name = 'execute_query';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryService) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { rule, queryPayload, input } = state;

    if (!rule) {
      throw new Error('ExecuteQueryStep requires rule from previous step');
    }

    if (!queryPayload) {
      throw new Error('ExecuteQueryStep requires queryPayload from previous step');
    }

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

    this.logger.debug({
      message: () => `ES|QL response values: ${JSON.stringify(esqlResponse.values, null, 2)}`,
    });

    return continueWith({ esqlResponse });
  }
}
