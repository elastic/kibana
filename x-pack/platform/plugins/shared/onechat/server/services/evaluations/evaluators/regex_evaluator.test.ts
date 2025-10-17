/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { Conversation, ConversationRound } from '@kbn/onechat-common';
import { createRegexEvaluator } from './regex_evaluator';
import type { EvaluatorContext } from '../types';

describe('regex_evaluator', () => {
  const createMockConversation = (): Conversation => ({
    id: 'conv-123',
    agent_id: 'agent-1',
    user: { id: 'user-1', username: 'testuser' },
    title: 'Test Conversation',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    rounds: [],
  });

  const createMockRound = (responseMessage: string): ConversationRound => ({
    id: 'round-1',
    input: { message: 'test input' },
    response: { message: responseMessage },
    steps: [],
  });

  describe('createRegexEvaluator', () => {
    it('returns 1.0 when regex matches response message', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Hello world'),
        customInstructions: 'world',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(1.0);
      expect(result.analysis).toBeUndefined();
    });

    it('returns 0.0 when regex does not match response message', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Hello there'),
        customInstructions: 'world',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(0.0);
    });

    it('handles case-sensitive patterns correctly', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Hello World'),
        customInstructions: 'world',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(0.0);

      const contextInsensitive: EvaluatorContext = {
        ...context,
        customInstructions: 'world|World',
      };
      const resultInsensitive = await evaluator(contextInsensitive);
      expect(resultInsensitive.score).toBe(1.0);
    });

    it('handles complex regex patterns with lookaheads', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('password123'),
        customInstructions: '^(?=.*\\d)(?=.*[a-z]).{8,}$',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(1.0);
    });

    it('handles regex patterns with groups', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('The price is $42.50'),
        customInstructions: '\\$(\\d+\\.\\d{2})',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(1.0);
    });

    it('handles regex patterns with special characters', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Email: test@example.com'),
        customInstructions: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(1.0);
    });

    it('throws error when customInstructions is not a string', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Hello world'),
        customInstructions: 123,
      };

      await expect(evaluator(context)).rejects.toThrow(
        'Regex evaluator requires customInstructions to be a string, got number'
      );
    });

    it('throws error for invalid regex patterns', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Hello world'),
        customInstructions: '[invalid(regex',
      };

      await expect(evaluator(context)).rejects.toThrow('Invalid regex pattern');
    });

    it('handles empty response message', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound(''),
        customInstructions: 'world',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(0.0);
    });

    it('handles empty regex pattern', async () => {
      const evaluator = createRegexEvaluator();
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Hello world'),
        customInstructions: '',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(1.0);
    });
  });
});
