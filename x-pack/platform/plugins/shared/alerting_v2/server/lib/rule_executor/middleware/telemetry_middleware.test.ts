/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionTelemetryMiddleware } from './telemetry_middleware';
import { createRuleExecutionMiddlewareContext } from './test_utils';
import { collectStreamResults, createPipelineStream, createRulePipelineState } from '../test_utils';
import { createRuleResponse } from '../../test_utils';
import { QueryResponseSizeExceededError } from '../../errors/query_response_size_exceeded_error';
import type { RuleExecutionTelemetryContract } from '../otel/rule_execution_telemetry';

describe('RuleExecutionTelemetryMiddleware', () => {
  let telemetry: jest.Mocked<RuleExecutionTelemetryContract>;
  let middleware: RuleExecutionTelemetryMiddleware;

  beforeEach(() => {
    telemetry = { recordQueryResponseSizeExceeded: jest.fn() };
    middleware = new RuleExecutionTelemetryMiddleware(telemetry);
  });

  const failingStream = (error: Error) =>
    (async function* () {
      throw error;
    })();

  it('passes results through untouched on success', async () => {
    const state = createRulePipelineState();
    const next = jest.fn().mockImplementation((input) => input);

    const results = await collectStreamResults(
      middleware.execute(
        createRuleExecutionMiddlewareContext(),
        next,
        createPipelineStream([state])
      )
    );

    expect(results).toEqual([{ type: 'continue', state }]);
    expect(telemetry.recordQueryResponseSizeExceeded).not.toHaveBeenCalled();
  });

  it('counts a response-size guardrail trip with the query type and the rule kind', async () => {
    const state = createRulePipelineState({ rule: createRuleResponse({ kind: 'signal' }) });
    const error = new QueryResponseSizeExceededError('breach', 10 * 1024 * 1024);
    // Consume the input (as a step would) before failing, so the rule kind is observed.
    const next = jest.fn().mockImplementation((input) =>
      (async function* () {
        for await (const _ of input) {
          throw error;
        }
      })()
    );

    await expect(
      collectStreamResults(
        middleware.execute(
          createRuleExecutionMiddlewareContext({ name: 'execute_rule_query' }),
          next,
          createPipelineStream([state])
        )
      )
    ).rejects.toBe(error);

    expect(telemetry.recordQueryResponseSizeExceeded).toHaveBeenCalledTimes(1);
    expect(telemetry.recordQueryResponseSizeExceeded).toHaveBeenCalledWith({
      queryType: 'breach',
      ruleKind: 'signal',
    });
  });

  it('reports the rule kind as unknown when the step failed before any state flowed in', async () => {
    const error = new QueryResponseSizeExceededError('recovery');
    const next = jest.fn().mockReturnValue(failingStream(error));

    await expect(
      collectStreamResults(
        middleware.execute(createRuleExecutionMiddlewareContext(), next, createPipelineStream([]))
      )
    ).rejects.toBe(error);

    expect(telemetry.recordQueryResponseSizeExceeded).toHaveBeenCalledWith({
      queryType: 'recovery',
      ruleKind: 'unknown',
    });
  });

  it('ignores other errors and rethrows them', async () => {
    const error = new Error('boom');
    const next = jest.fn().mockReturnValue(failingStream(error));

    await expect(
      collectStreamResults(
        middleware.execute(createRuleExecutionMiddlewareContext(), next, createPipelineStream([]))
      )
    ).rejects.toBe(error);

    expect(telemetry.recordQueryResponseSizeExceeded).not.toHaveBeenCalled();
  });
});
