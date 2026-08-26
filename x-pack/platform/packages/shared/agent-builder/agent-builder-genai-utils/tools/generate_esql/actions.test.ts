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
  type AutocorrectQueryAction,
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
        const messages = formatAction(action, { withoutToolCalls: true });
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
        const messages = formatAction(action, {
          withoutToolCalls: false,
          toolCallId: 'action_0',
        });
        expect(messages).toHaveLength(2);
        expect(messages[0]).toBeInstanceOf(AIMessage);
        const aiMessage = messages[0] as AIMessage;
        expect(aiMessage.tool_calls).toHaveLength(1);
        expect(aiMessage.tool_calls?.[0].name).toBe('validate_query');
        expect(aiMessage.tool_calls?.[0].args).toEqual({ query: action.query });
        expect(aiMessage.tool_calls?.[0].id).toBe('action_0');
        expect(messages[1]).toBeInstanceOf(ToolMessage);
        expect((messages[1] as ToolMessage).tool_call_id).toBe('action_0');
        const toolContent = JSON.parse((messages[1] as ToolMessage).content as string);
        expect(toolContent.success).toBe(false);
        expect(toolContent.error).toBe('expected integer');
      });

      it('defaults to withoutToolCalls=true when no options are passed (regression guard)', () => {
        // Pins today's production default: `formatAction(action)` with no second argument
        // must behave exactly like the old positional default `withoutToolCalls = true`,
        // not switch to tool-call format. See the "Implementation risk" note on the
        // formatAction options-object migration.
        const action: ValidateQueryAction = {
          type: 'validate_query',
          query: 'FROM index | WHER x',
          success: false,
          error: 'Unknown column [WHER]',
        };
        const withNoOptions = formatAction(action);
        const withExplicitDefault = formatAction(action, { withoutToolCalls: true });
        expect(withNoOptions).toEqual(withExplicitDefault);
        expect(withNoOptions[0]).toBeInstanceOf(AIMessage);
        expect((withNoOptions[0] as AIMessage).tool_calls ?? []).toHaveLength(0);
        expect(withNoOptions[1]).toBeInstanceOf(HumanMessage);
      });

      it('is deterministic: same action + same toolCallId produces deep-equal output', () => {
        const action: ValidateQueryAction = {
          type: 'validate_query',
          query: 'FROM index | LIMIT x',
          success: false,
          error: 'expected integer',
        };
        const options = { withoutToolCalls: false, toolCallId: 'action_2' };
        expect(formatAction(action, options)).toEqual(formatAction(action, options));
      });
    });

    describe('execute_query', () => {
      it('defaults to withoutToolCalls=true (conversational, not tool-call) when no options are passed (regression guard)', () => {
        const action: ExecuteQueryAction = {
          type: 'execute_query',
          query: 'FROM index | WHER x',
          success: false,
          error: 'Unknown column [WHER]',
        };
        const messages = formatAction(action);
        expect(messages).toHaveLength(2);
        expect(messages[0]).toBeInstanceOf(AIMessage);
        expect((messages[0] as AIMessage).tool_calls ?? []).toHaveLength(0);
        expect((messages[0] as AIMessage).content).toBe('Now you can execute the query');
        expect(messages[1]).toBeInstanceOf(HumanMessage);
        const userContent = (messages[1] as HumanMessage).content as string;
        expect(userContent).toContain('I tried executing the query and got the following error');
        expect(userContent).toContain('Unknown column [WHER]');
      });

      it('returns tool call + tool result when execution failed and withoutToolCalls=false', () => {
        const action: ExecuteQueryAction = {
          type: 'execute_query',
          query: 'FROM index | WHER x',
          success: false,
          error: 'Unknown column [WHER]',
        };
        const messages = formatAction(action, {
          withoutToolCalls: false,
          toolCallId: 'action_1',
        });
        expect(messages[0]).toBeInstanceOf(AIMessage);
        expect((messages[0] as AIMessage).tool_calls?.[0].id).toBe('action_1');
        expect(messages[1]).toBeInstanceOf(ToolMessage);
        expect((messages[1] as ToolMessage).tool_call_id).toBe('action_1');
      });
    });

    describe('autocorrect_query', () => {
      it('defaults to withoutToolCalls=true (conversational, not tool-call) when no options are passed (regression guard)', () => {
        const action: AutocorrectQueryAction = {
          type: 'autocorrect_query',
          wasCorrected: true,
          input: 'FROM index | WHERE a = "b"',
          output: 'FROM index\n| WHERE a == "b"',
        };
        const messages = formatAction(action);
        expect(messages).toHaveLength(2);
        expect(messages[0]).toBeInstanceOf(AIMessage);
        expect((messages[0] as AIMessage).tool_calls ?? []).toHaveLength(0);
        expect((messages[0] as AIMessage).content).toBe('Now you can execute the query');
        expect(messages[1]).toBeInstanceOf(HumanMessage);
        const userContent = (messages[1] as HumanMessage).content as string;
        expect(userContent).toContain('I ran the query through autocorrect');
        expect(userContent).toContain(action.output);
      });

      it('returns tool call + tool result when corrected and withoutToolCalls=false', () => {
        const action: AutocorrectQueryAction = {
          type: 'autocorrect_query',
          wasCorrected: true,
          input: 'FROM index | WHERE a = "b"',
          output: 'FROM index\n| WHERE a == "b"',
        };
        const messages = formatAction(action, {
          withoutToolCalls: false,
          toolCallId: 'action_1',
        });
        expect(messages[0]).toBeInstanceOf(AIMessage);
        expect((messages[0] as AIMessage).tool_calls?.[0].id).toBe('action_1');
        expect(messages[1]).toBeInstanceOf(ToolMessage);
        expect((messages[1] as ToolMessage).tool_call_id).toBe('action_1');
      });
    });
  });
});
