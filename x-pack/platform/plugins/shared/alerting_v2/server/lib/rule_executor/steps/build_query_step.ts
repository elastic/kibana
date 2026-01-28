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

@injectable()
export class BuildQueryStep implements RuleExecutionStep {
  public readonly name = 'build_query';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { rule, input } = state;

    if (!rule) {
      throw new Error('BuildQueryStep requires rule from previous step');
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

    return { type: 'continue', data: { queryPayload } };
  }
}
