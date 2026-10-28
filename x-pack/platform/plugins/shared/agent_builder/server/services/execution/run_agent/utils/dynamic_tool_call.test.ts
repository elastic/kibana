/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolCallInvocation } from '@kbn/agent-builder-common';
import {
  dynamicToolCallStepFields,
  toModelToolCall,
  unwrapDynamicToolCall,
  wrapDynamicToolCall,
} from './dynamic_tool_call';

describe('dynamic tool call helpers', () => {
  describe('unwrapDynamicToolCall', () => {
    it('returns the inner call for well-formed args', () => {
      expect(unwrapDynamicToolCall({ tool_id: 'a.b', params: { q: 1 } })).toEqual({
        toolId: 'a.b',
        params: { q: 1 },
      });
    });

    it.each([
      ['missing tool_id', { params: {} }],
      ['empty tool_id', { tool_id: '', params: {} }],
      ['non-string tool_id', { tool_id: 1, params: {} }],
      ['missing params', { tool_id: 'a' }],
      ['null params', { tool_id: 'a', params: null }],
      ['array params', { tool_id: 'a', params: [] }],
      ['string params', { tool_id: 'a', params: '{}' }],
    ])('returns undefined for %s', (_label, args) => {
      expect(unwrapDynamicToolCall(args as Record<string, unknown>)).toBeUndefined();
    });
  });

  describe('wrapDynamicToolCall', () => {
    it('is the inverse of unwrap', () => {
      const args = wrapDynamicToolCall({ toolId: 'a.b', params: { q: 1 } });
      expect(args).toEqual({ tool_id: 'a.b', params: { q: 1 } });
      expect(unwrapDynamicToolCall(args)).toEqual({ toolId: 'a.b', params: { q: 1 } });
    });
  });

  describe('dynamicToolCallStepFields', () => {
    it('maps the inner call onto step fields with a dynamic invocation', () => {
      expect(dynamicToolCallStepFields({ tool_id: 'a.b', params: { q: 1 } })).toEqual({
        tool_id: 'a.b',
        params: { q: 1 },
        invocation: ToolCallInvocation.dynamic,
      });
    });

    it('returns undefined for malformed args so the step keeps the outer call', () => {
      expect(dynamicToolCallStepFields({ tool_id: 'a.b' })).toBeUndefined();
    });
  });

  describe('toModelToolCall', () => {
    it('wraps a dynamic step back into execute_dynamic_tool', () => {
      expect(
        toModelToolCall({
          tool_id: 'a.b',
          params: { q: 1 },
          invocation: ToolCallInvocation.dynamic,
        })
      ).toEqual({
        toolId: 'execute_dynamic_tool',
        args: { tool_id: 'a.b', params: { q: 1 } },
      });
    });

    it('returns a native step as is, whether invocation is absent or native', () => {
      expect(toModelToolCall({ tool_id: 'a.b', params: { q: 1 } })).toEqual({
        toolId: 'a.b',
        args: { q: 1 },
      });
      expect(
        toModelToolCall({ tool_id: 'a.b', params: { q: 1 }, invocation: ToolCallInvocation.native })
      ).toEqual({ toolId: 'a.b', args: { q: 1 } });
    });
  });
});
