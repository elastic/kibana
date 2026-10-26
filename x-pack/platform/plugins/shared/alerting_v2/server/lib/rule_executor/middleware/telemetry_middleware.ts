/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionMiddleware, RuleExecutionMiddlewareContext } from './types';
import type { PipelineStateStream, RulePipelineState } from '../types';
import { QueryResponseSizeExceededError } from '../../errors/query_response_size_exceeded_error';
import {
  RuleExecutionTelemetryToken,
  type RuleExecutionTelemetryContract,
  type RuleKindAttribute,
} from '../otel/rule_execution_telemetry';

/**
 * Records OTel metrics for guardrail trips surfaced as typed errors by the steps.
 *
 * Steps stay free of telemetry: they throw a `QueryResponseSizeExceededError` carrying the
 * query type, and this middleware counts it, attributing the rule kind from the latest
 * state that flowed into the step. The error is rethrown untouched.
 */
@injectable()
export class RuleExecutionTelemetryMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'telemetry';

  constructor(
    @inject(RuleExecutionTelemetryToken)
    private readonly telemetry: RuleExecutionTelemetryContract
  ) {}

  public execute(
    _ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    let latestState: RulePipelineState | undefined;

    const tappedInput: PipelineStateStream = (async function* () {
      for await (const result of input) {
        latestState = result.state;
        yield result;
      }
    })();

    const stream = next(tappedInput);
    const telemetry = this.telemetry;

    return (async function* () {
      try {
        for await (const result of stream) {
          latestState = result.state;
          yield result;
        }
      } catch (error) {
        if (error instanceof QueryResponseSizeExceededError) {
          telemetry.recordQueryResponseSizeExceeded({
            queryType: error.queryType,
            ruleKind: toRuleKindAttribute(latestState),
          });
        }
        throw error;
      }
    })();
  }
}

const toRuleKindAttribute = (state: RulePipelineState | undefined): RuleKindAttribute => {
  const kind = state?.rule?.kind;
  return kind === 'alert' || kind === 'signal' ? kind : 'unknown';
};
