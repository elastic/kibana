/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';
import { GenAISemanticConventions } from './types';
import {
  withExecuteToolSpan,
  markToolSpanAsError,
  TOOL_ERROR_TYPE,
} from './with_execute_tool_span';

const mockSpan: Span = {
  setAttribute: jest.fn().mockReturnThis(),
  setStatus: jest.fn().mockReturnThis(),
  end: jest.fn(),
  isRecording: jest.fn().mockReturnValue(true),
  recordException: jest.fn(),
  setAttributes: jest.fn().mockReturnThis(),
  addEvent: jest.fn().mockReturnThis(),
  addLink: jest.fn().mockReturnThis(),
  addLinks: jest.fn().mockReturnThis(),
  updateName: jest.fn().mockReturnThis(),
  spanContext: jest.fn().mockReturnValue({
    traceId: '0'.repeat(32),
    spanId: '0'.repeat(16),
    traceFlags: 0,
  }),
};

jest.mock('./with_active_inference_span', () => ({
  withActiveInferenceSpan: jest.fn((_name: string, _opts: unknown, cb: (span: Span) => unknown) =>
    cb(mockSpan)
  ),
}));

describe('withExecuteToolSpan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockSpan.isRecording as jest.Mock).mockReturnValue(true);
  });

  it('sets gen_ai.tool.call.result on async success', async () => {
    const result = { data: 'ok' };
    const value = await withExecuteToolSpan(
      'myTool',
      { tool: { input: { q: '1' }, toolCallId: 'tc-1' } },
      async () => result
    );

    expect(value).toBe(result);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      GenAISemanticConventions.GenAIToolCallResult,
      JSON.stringify(result)
    );
    expect(mockSpan.setStatus).not.toHaveBeenCalled();
    expect(mockSpan.end).not.toHaveBeenCalled();
  });

  it('returns sync value without setting result', () => {
    const result = { value: 42 };
    const value = withExecuteToolSpan('syncTool', { tool: { input: {} } }, () => result);

    expect(value).toBe(result);
    expect(mockSpan.setAttribute).not.toHaveBeenCalledWith(
      GenAISemanticConventions.GenAIToolCallResult,
      expect.anything()
    );
  });

  it('marks the span as tool_error when the async callback rejects', async () => {
    const error = new Error('boom');

    await expect(
      withExecuteToolSpan('failingTool', { tool: { input: {} } }, async () => {
        throw error;
      })
    ).rejects.toBe(error);

    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', TOOL_ERROR_TYPE);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: TOOL_ERROR_TYPE,
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('marks the span as tool_error when the sync callback throws', () => {
    const error = new Error('sync boom');

    expect(() =>
      withExecuteToolSpan('failingSyncTool', { tool: { input: {} } }, () => {
        throw error;
      })
    ).toThrow(error);

    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', TOOL_ERROR_TYPE);
    expect(mockSpan.end).toHaveBeenCalled();
  });
});

describe('markToolSpanAsError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockSpan.isRecording as jest.Mock).mockReturnValue(true);
  });

  it('sets error.type, ERROR status, and ends the span without result', () => {
    markToolSpanAsError(mockSpan);

    expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', TOOL_ERROR_TYPE);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: TOOL_ERROR_TYPE,
    });
    expect(mockSpan.end).toHaveBeenCalled();
    expect(mockSpan.recordException).not.toHaveBeenCalled();
    expect(mockSpan.setAttribute).not.toHaveBeenCalledWith(
      GenAISemanticConventions.GenAIToolCallResult,
      expect.anything()
    );
  });

  it('sets gen_ai.tool.call.result before ending span', () => {
    const result = { message: 'failed' };
    markToolSpanAsError(mockSpan, { result });

    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      GenAISemanticConventions.GenAIToolCallResult,
      JSON.stringify(result)
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', TOOL_ERROR_TYPE);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: TOOL_ERROR_TYPE,
    });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('records the exception and derives the result from the error message', () => {
    const error = new Error('boom');
    markToolSpanAsError(mockSpan, { error });

    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      GenAISemanticConventions.GenAIToolCallResult,
      JSON.stringify({ error: 'boom' })
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', TOOL_ERROR_TYPE);
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('prefers an explicit result over the error message', () => {
    const error = new Error('boom');
    const result = [{ type: 'error' }];
    markToolSpanAsError(mockSpan, { result, error });

    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      GenAISemanticConventions.GenAIToolCallResult,
      JSON.stringify(result)
    );
  });

  it('skips result attribute when neither result nor error is provided', () => {
    markToolSpanAsError(mockSpan, {});

    expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', TOOL_ERROR_TYPE);
    expect(mockSpan.end).toHaveBeenCalled();
    const resultCalls = (mockSpan.setAttribute as jest.Mock).mock.calls.filter(
      (call) => call[0] === GenAISemanticConventions.GenAIToolCallResult
    );
    expect(resultCalls).toHaveLength(0);
  });

  it('no-ops when the span is not recording', () => {
    (mockSpan.isRecording as jest.Mock).mockReturnValue(false);

    markToolSpanAsError(mockSpan, { error: new Error('boom') });

    expect(mockSpan.recordException).not.toHaveBeenCalled();
    expect(mockSpan.setAttribute).not.toHaveBeenCalled();
    expect(mockSpan.setStatus).not.toHaveBeenCalled();
    expect(mockSpan.end).not.toHaveBeenCalled();
  });
});
