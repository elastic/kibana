/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import {
  formatAction,
  isValidateQueryAction,
  type ValidateQueryAction,
  type ExecuteQueryAction,
  type GenerateQueryAction,
} from './actions';

describe('generate_esql actions', () => {
  describe('isValidateQueryAction', () => {
    it('returns true for a ValidateQueryAction', () => {
      const action: ValidateQueryAction = {
        type: 'validate_query',
        query: 'FROM index | LIMIT 10',
        success: true,
      };
      expect(isValidateQueryAction(action)).toBe(true);
    });

    it('returns false for other action types', () => {
      expect(
        isValidateQueryAction({
          type: 'execute_query',
          query: 'FROM index',
          success: false,
          error: 'err',
        } as ExecuteQueryAction)
      ).toBe(false);
      expect(
        isValidateQueryAction({
          type: 'generate_query',
          success: true,
          response: 'ok',
        } as GenerateQueryAction)
      ).toBe(false);
    });
  });

  describe('formatAction', () => {
    describe('validate_query', () => {
      it('returns empty array when validation succeeded', () => {
        const action: ValidateQueryAction = {
          type: 'validate_query',
          query: 'FROM index | LIMIT 10',
          success: true,
        };
        expect(formatAction(action)).toEqual([]);
      });

      it('returns AI + user message with error when validation failed (withoutToolCalls=true)', () => {
        const action: ValidateQueryAction = {
          type: 'validate_query',
          query: 'FROM index | WHER x',
          success: false,
          error: 'Unknown column [WHER]',
        };
        const messages = formatAction(action, true);
        expect(messages).toHaveLength(2);
        expect(messages[0]).toBeInstanceOf(AIMessage);
        expect((messages[0] as AIMessage).content).toBe('Now you can validate the query');
        expect(messages[1]).toBeInstanceOf(HumanMessage);
        const userContent = (messages[1] as HumanMessage).content as string;
        expect(userContent).toContain('I tried validating the query and got the following error');
        expect(userContent).toContain('Unknown column [WHER]');
        expect(userContent).toContain('Can you fix the query?');
      });

      it('returns tool call + tool result when validation failed (withoutToolCalls=false)', () => {
        const action: ValidateQueryAction = {
          type: 'validate_query',
          query: 'FROM index | LIMIT x',
          success: false,
          error: 'expected integer',
        };
        const messages = formatAction(action, false);
        expect(messages).toHaveLength(2);
        expect(messages[0]).toBeInstanceOf(AIMessage);
        const aiMessage = messages[0] as AIMessage;
        expect(aiMessage.tool_calls).toHaveLength(1);
        expect(aiMessage.tool_calls?.[0].name).toBe('validate_query');
        expect(aiMessage.tool_calls?.[0].args).toEqual({ query: action.query });
        expect(messages[1]).toBeInstanceOf(ToolMessage);
        const toolContent = JSON.parse((messages[1] as ToolMessage).content as string);
        expect(toolContent.success).toBe(false);
        expect(toolContent.error).toBe('expected integer');
      });
    });
  });
});
