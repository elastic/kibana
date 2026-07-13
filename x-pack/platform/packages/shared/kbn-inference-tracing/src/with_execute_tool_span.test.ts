/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';
import { GenAISemanticConventions } from './types';
import { withExecuteToolSpan, TOOL_ERROR_TYPE } from './with_execute_tool_span';

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

  describe('when isToolError is not provided', () => {
    it('sets gen_ai.tool.call.result on success (async)', async () => {
      const result = { results: [{ type: 'other', data: {} }] };
      const value = await withExecuteToolSpan(
        'myTool',
        { tool: { input: { q: '1' }, toolCallId: 'tc-1' }, isToolError: () => false },
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
  });

  describe('when isToolError returns false', () => {
    it('sets gen_ai.tool.call.result normally', async () => {
      const result = { results: [{ type: 'other', data: {} }] };
      const value = await withExecuteToolSpan(
        'myTool',
        {
          tool: { input: {}, toolCallId: 'tc-2' },
          isToolError: () => false,
        },
        async () => result
      );

      expect(value).toBe(result);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        GenAISemanticConventions.GenAIToolCallResult,
        JSON.stringify(result)
      );
      expect(mockSpan.setStatus).not.toHaveBeenCalled();
    });
  });

  describe('when isToolError returns true', () => {
    it('sets error.type and ERROR status, does NOT set result', async () => {
      const errorResult = { results: [{ type: 'error', data: { message: 'boom' } }] };
      const value = await withExecuteToolSpan(
        'myTool',
        {
          tool: { input: {}, toolCallId: 'tc-3' },
          isToolError: (r) =>
            typeof r === 'object' &&
            r !== null &&
            'results' in r &&
            Array.isArray((r as { results: unknown[] }).results) &&
            (r as { results: Array<{ type: string }> }).results.every(
              (item) => item.type === 'error'
            ),
        },
        async () => errorResult
      );

      expect(value).toBe(errorResult);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('error.type', TOOL_ERROR_TYPE);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: TOOL_ERROR_TYPE,
      });
      expect(mockSpan.end).toHaveBeenCalled();

      const setAttrCalls = (mockSpan.setAttribute as jest.Mock).mock.calls;
      const resultCalls = setAttrCalls.filter(
        ([key]: [string]) => key === GenAISemanticConventions.GenAIToolCallResult
      );
      expect(resultCalls).toHaveLength(0);
    });

    it('still returns the value to the caller', async () => {
      const errorResult = { results: [{ type: 'error', data: { message: 'oops' } }] };
      const value = await withExecuteToolSpan(
        'myTool',
        {
          tool: { input: {} },
          isToolError: () => true,
        },
        async () => errorResult
      );

      expect(value).toEqual(errorResult);
    });
  });

  describe('synchronous callback', () => {
    it('does not call isToolError for sync returns', () => {
      const isToolError = jest.fn().mockReturnValue(true);
      const result = { value: 42 };

      const value = withExecuteToolSpan(
        'syncTool',
        { tool: { input: {} }, isToolError },
        () => result
      );

      expect(value).toBe(result);
      expect(isToolError).not.toHaveBeenCalled();
    });
  });
});
