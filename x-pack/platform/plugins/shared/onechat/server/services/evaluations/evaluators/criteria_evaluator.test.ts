/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Conversation, ConversationRound } from '@kbn/onechat-common';
import { createCriteriaEvaluator } from './criteria_evaluator';
import type { EvaluatorContext } from '../types';

describe('criteria_evaluator', () => {
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

  const createMockInferenceClient = (responseContent: string): BoundInferenceClient => {
    return {
      chatComplete: jest.fn().mockResolvedValue({
        content: responseContent,
        tokens: { completion: 10, prompt: 5, total: 15 },
      }),
    } as any;
  };

  describe('createCriteriaEvaluator', () => {
    it('returns valid score when LLM responds with a number in range', async () => {
      const mockClient = createMockInferenceClient('0.8');
      const evaluator = createCriteriaEvaluator({ inferenceClient: mockClient });
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Hello, I am speaking in a Glaswegian accent, aye!'),
        customInstructions: 'Response uses a Glaswegian accent',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(0.8);
      expect(result.analysis).toBeUndefined();
    });

    it('uses default criteria when customInstructions is not a string', async () => {
      const mockClient = createMockInferenceClient('0.8');
      const evaluator = createCriteriaEvaluator({ inferenceClient: mockClient });
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Test response'),
        customInstructions: 123,
      };

      const result = await evaluator(context);
      expect(result.score).toBe(0.8);

      const chatCompleteMock = mockClient.chatComplete as jest.Mock;
      const callArgs = chatCompleteMock.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(
        "The agent provided a clear answer to the user's question"
      );
    });

    it('uses default criteria when customInstructions is empty', async () => {
      const mockClient = createMockInferenceClient('0.8');
      const evaluator = createCriteriaEvaluator({ inferenceClient: mockClient });
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Test response'),
        customInstructions: '   ',
      };

      const result = await evaluator(context);
      expect(result.score).toBe(0.8);

      const chatCompleteMock = mockClient.chatComplete as jest.Mock;
      const callArgs = chatCompleteMock.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(
        "The agent provided a clear answer to the user's question"
      );
    });

    it('throws error when LLM returns non-numeric response', async () => {
      const mockClient = createMockInferenceClient('not a number');
      const evaluator = createCriteriaEvaluator({ inferenceClient: mockClient });
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Test response'),
        customInstructions: 'Test criteria',
      };

      await expect(evaluator(context)).rejects.toThrow(
        'Failed to parse LLM response as a number. Received: "not a number"'
      );
    });

    it('throws error when LLM returns score below 0', async () => {
      const mockClient = createMockInferenceClient('-0.5');
      const evaluator = createCriteriaEvaluator({ inferenceClient: mockClient });
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Test response'),
        customInstructions: 'Test criteria',
      };

      await expect(evaluator(context)).rejects.toThrow(
        'LLM returned score outside valid range [0, 1]. Received: -0.5'
      );
    });

    it('throws error when LLM returns score above 1', async () => {
      const mockClient = createMockInferenceClient('1.5');
      const evaluator = createCriteriaEvaluator({ inferenceClient: mockClient });
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Test response'),
        customInstructions: 'Test criteria',
      };

      await expect(evaluator(context)).rejects.toThrow(
        'LLM returned score outside valid range [0, 1]. Received: 1.5'
      );
    });

    it('throws error when inference client fails', async () => {
      const mockClient = {
        chatComplete: jest.fn().mockRejectedValue(new Error('Network error')),
      } as any;
      const evaluator = createCriteriaEvaluator({ inferenceClient: mockClient });
      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Test response'),
        customInstructions: 'Test criteria',
      };

      await expect(evaluator(context)).rejects.toThrow(
        'Error calling inference client: Network error'
      );
    });
  });
});
