/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpanStatusCode } from '@opentelemetry/api';
import { ApmMiddleware } from './apm_middleware';
import { createRuleExecutionMiddlewareContext } from './test_utils';
import { collectStreamResults, createPipelineStream, createRulePipelineState } from '../test_utils';
import { getDefaultTracer } from '@kbn/default-tracer';

const mockSpan = {
  setStatus: jest.fn(),
  recordException: jest.fn(),
  end: jest.fn(),
  isRecording: jest.fn().mockReturnValue(true),
};

const mockStartSpan = jest.fn(() => mockSpan);

jest.mock('@kbn/default-tracer', () => ({
  getDefaultTracer: jest.fn(() => ({
    startSpan: mockStartSpan,
  })),
}));

const getDefaultTracerMock = getDefaultTracer as jest.MockedFunction<typeof getDefaultTracer>;

describe('ApmMiddleware', () => {
  let middleware: ApmMiddleware;

  beforeEach(() => {
    middleware = new ApmMiddleware();
    jest.clearAllMocks();
    mockSpan.isRecording.mockReturnValue(true);
  });

  it('wraps the stream in an OpenTelemetry span and sets success status', async () => {
    const state = createRulePipelineState();
    const context = createRuleExecutionMiddlewareContext();
    const next = jest.fn().mockReturnValue(createPipelineStream([state]));

    const results = await collectStreamResults(
      middleware.execute(context, next, createPipelineStream([state]))
    );

    expect(results).toEqual([{ type: 'continue', state }]);
    expect(mockStartSpan).toHaveBeenCalledWith('rule_executor:test_step', {
      attributes: { plugin: 'alerting_v2' },
    });
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('sets error status and ends span when stream throws', async () => {
    const context = createRuleExecutionMiddlewareContext();
    const error = new Error('stream error');

    const next = jest.fn().mockReturnValue(
      (async function* () {
        throw error;
      })()
    );

    await expect(
      collectStreamResults(middleware.execute(context, next, createPipelineStream()))
    ).rejects.toThrow('stream error');

    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'stream error',
    });
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('yields all results from the inner stream', async () => {
    const state1 = createRulePipelineState();
    const state2 = createRulePipelineState();
    const context = createRuleExecutionMiddlewareContext();
    const next = jest.fn().mockReturnValue(createPipelineStream([state1, state2]));

    const results = await collectStreamResults(
      middleware.execute(context, next, createPipelineStream([state1, state2]))
    );

    expect(results).toHaveLength(2);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('handles undefined tracer gracefully when tracer is not available', async () => {
    getDefaultTracerMock.mockReturnValueOnce(undefined as never);

    const state = createRulePipelineState();
    const context = createRuleExecutionMiddlewareContext();
    const next = jest.fn().mockReturnValue(createPipelineStream([state]));

    const results = await collectStreamResults(
      middleware.execute(context, next, createPipelineStream([state]))
    );

    expect(results).toEqual([{ type: 'continue', state }]);
    expect(mockSpan.end).not.toHaveBeenCalled();
  });
});
