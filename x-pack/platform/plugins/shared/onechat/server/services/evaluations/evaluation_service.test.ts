/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { Conversation, ConversationRound } from '@kbn/onechat-common';
import { EvaluatorId } from '../../../common/http_api/evaluations';
import type { EvaluatorConfig } from '../../../common/http_api/evaluations';
import type { EvaluationService } from './evaluation_service';
import { EvaluationServiceImpl } from './evaluation_service';

describe('EvaluationService', () => {
  let logger: MockedLogger;
  let service: EvaluationService;
  beforeEach(() => {
    logger = loggerMock.create();
    service = new EvaluationServiceImpl({ logger });
  });

  const createMockConversation = (rounds: ConversationRound[]): Conversation => ({
    id: 'conv-123',
    agent_id: 'agent-1',
    user: { id: 'user-1', username: 'testuser' },
    title: 'Test Conversation',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    rounds,
  });

  const createMockRound = (id: string, responseMessage: string): ConversationRound => ({
    id,
    input: { message: 'test input' },
    response: { message: responseMessage },
    steps: [],
  });

  describe('evaluateConversation', () => {
    it('evaluates all rounds in a conversation', async () => {
      const conversation = createMockConversation([
        createMockRound('round-1', 'Hello world'),
        createMockRound('round-2', 'Goodbye world'),
      ]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Regex,
          customInstructions: 'world',
        },
      ];

      const results = await service.evaluateConversation(conversation, evaluatorConfigs);

      expect(results).toHaveLength(2);
      expect(results[0].roundId).toBe('round-1');
      expect(results[1].roundId).toBe('round-2');
    });

    it('runs multiple evaluators per round', async () => {
      const conversation = createMockConversation([createMockRound('round-1', 'Hello world')]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Regex,
          customInstructions: 'world',
        },
        {
          evaluatorId: EvaluatorId.Regex,
          customInstructions: 'Hello',
        },
      ];

      const results = await service.evaluateConversation(conversation, evaluatorConfigs);

      expect(results).toHaveLength(1);
      expect(results[0].scores).toHaveLength(2);
      expect(results[0].scores[0].evaluatorId).toBe(EvaluatorId.Regex);
      expect(results[0].scores[0].score).toBe(1);
      expect(results[0].scores[1].evaluatorId).toBe(EvaluatorId.Regex);
      expect(results[0].scores[1].score).toBe(1);
    });

    it('calls regex evaluator for EvaluatorId.Regex', async () => {
      const conversation = createMockConversation([createMockRound('round-1', 'Hello world')]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Regex,
          customInstructions: 'world',
        },
      ];

      const results = await service.evaluateConversation(conversation, evaluatorConfigs);

      expect(results[0].scores[0].score).toBe(1);
    });

    it('returns mock scores for non-regex evaluators', async () => {
      const conversation = createMockConversation([createMockRound('round-1', 'Hello world')]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Relevance,
          customInstructions: 'test',
        },
      ];

      const results = await service.evaluateConversation(conversation, evaluatorConfigs);

      expect(results[0].scores[0].score).toBeGreaterThanOrEqual(0);
      expect(results[0].scores[0].score).toBeLessThanOrEqual(1);
    });

    it('uses evaluatorIdOverride when provided', async () => {
      const conversation = createMockConversation([createMockRound('round-1', 'Hello world')]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Regex,
          evaluatorIdOverride: 'custom-regex-1',
          customInstructions: 'world',
        },
      ];

      const results = await service.evaluateConversation(conversation, evaluatorConfigs);

      expect(results[0].scores[0].evaluatorId).toBe('custom-regex-1');
    });

    it('returns correct structure matching EvaluationRunResponse', async () => {
      const conversation = createMockConversation([
        createMockRound('round-1', 'Hello world'),
        createMockRound('round-2', 'Goodbye world'),
      ]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Regex,
          customInstructions: 'world',
        },
        {
          evaluatorId: EvaluatorId.Relevance,
          customInstructions: 'test',
        },
      ];

      const results = await service.evaluateConversation(conversation, evaluatorConfigs);

      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            roundId: expect.any(String),
            scores: expect.arrayContaining([
              expect.objectContaining({
                evaluatorId: expect.any(String),
                score: expect.any(Number),
              }),
            ]),
          }),
        ])
      );
    });

    it('handles conversations with empty rounds', async () => {
      const conversation = createMockConversation([]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Regex,
          customInstructions: 'world',
        },
      ];

      const results = await service.evaluateConversation(conversation, evaluatorConfigs);

      expect(results).toHaveLength(0);
    });

    it('handles regex evaluator errors and logs them', async () => {
      const conversation = createMockConversation([createMockRound('round-1', 'Hello world')]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Regex,
          customInstructions: '[invalid(regex',
        },
      ];

      await expect(service.evaluateConversation(conversation, evaluatorConfigs)).rejects.toThrow(
        'Invalid regex pattern'
      );
    });

    it('handles missing customInstructions gracefully', async () => {
      const conversation = createMockConversation([createMockRound('round-1', 'Hello world')]);

      const evaluatorConfigs: EvaluatorConfig[] = [
        {
          evaluatorId: EvaluatorId.Regex,
        },
      ];

      const results = await service.evaluateConversation(conversation, evaluatorConfigs);

      expect(results[0].scores[0].score).toBe(1);
    });
  });
});
