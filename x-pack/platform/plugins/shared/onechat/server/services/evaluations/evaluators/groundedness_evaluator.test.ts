/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Conversation, ConversationRound, ToolCallStep } from '@kbn/onechat-common';
import { ConversationRoundStepType, ToolResultType } from '@kbn/onechat-common';
import { createGroundednessEvaluator } from './groundedness_evaluator';
import type { EvaluatorContext } from '../types';
import type { GroundednessAnalysis } from '@kbn/evals/src/evaluators/groundedness/types';

describe('groundedness_evaluator', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  const createMockConversation = (): Conversation => ({
    id: 'conv-123',
    agent_id: 'agent-1',
    user: { id: 'user-1', username: 'testuser' },
    title: 'Test Conversation',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    rounds: [],
  });

  const createMockRound = (
    responseMessage: string,
    steps: ConversationRound['steps'] = []
  ): ConversationRound => ({
    id: 'round-1',
    input: { message: 'What is the company policy on parental leave?' },
    response: { message: responseMessage },
    steps,
  });

  const createMockToolCallStep = (
    toolCallId: string,
    toolId: string,
    result: any
  ): ToolCallStep => ({
    type: ConversationRoundStepType.toolCall,
    tool_call_id: toolCallId,
    tool_id: toolId,
    params: {},
    results: [
      {
        type: ToolResultType.other,
        tool_result_id: `result-${toolCallId}`,
        data: { text: JSON.stringify(result) },
      },
    ],
  });

  const createMockGroundednessAnalysis = (
    summaryVerdict: GroundednessAnalysis['summary_verdict'],
    claims: Array<{
      verdict: 'FULLY_SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'CONTRADICTED' | 'NOT_FOUND';
      centrality?: 'central' | 'peripheral';
    }>
  ): GroundednessAnalysis => ({
    summary_verdict: summaryVerdict,
    analysis: claims.map((claim) => ({
      claim: 'Test claim',
      centrality: claim.centrality || 'central',
      centrality_reason: 'Test reason',
      verdict: claim.verdict,
      evidence: {
        tool_call_id: 'tool-1',
        tool_id: 'search',
        evidence_snippet: 'Test evidence',
      },
      explanation: 'Test explanation',
    })),
  });

  const createMockInferenceClient = (analysis: GroundednessAnalysis): BoundInferenceClient => {
    return {
      prompt: jest.fn().mockResolvedValue({
        toolCalls: [
          {
            function: {
              arguments: analysis,
            },
          },
        ],
      }),
    } as any;
  };

  describe('createGroundednessEvaluator', () => {
    it('returns perfect score for fully grounded response', async () => {
      const analysis = createMockGroundednessAnalysis('GROUNDED', [
        { verdict: 'FULLY_SUPPORTED' },
        { verdict: 'FULLY_SUPPORTED' },
      ]);
      const mockClient = createMockInferenceClient(analysis);
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCallStep = createMockToolCallStep('tool-1', 'search', {
        policy: 'Employees are entitled to 18 months of job-protected leave',
      });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound(
          'Our policy provides up to 18 months of job-protected parental leave.',
          [toolCallStep]
        ),
        customInstructions: '',
      };

      const result = await evaluator(context);
      expect(result).toBe(1.0);
    });

    it('returns 1.0 when there are no tool calls', async () => {
      const mockClient = createMockInferenceClient(createMockGroundednessAnalysis('GROUNDED', []));
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Response without tool calls', []),
        customInstructions: '',
      };

      const result = await evaluator(context);
      expect(result).toBe(1.0);
    });

    it('calculates score correctly for partially supported claims', async () => {
      const analysis = createMockGroundednessAnalysis('GROUNDED', [
        { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
        { verdict: 'PARTIALLY_SUPPORTED', centrality: 'central' },
      ]);
      const mockClient = createMockInferenceClient(analysis);
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCallStep = createMockToolCallStep('tool-1', 'search', { data: 'test' });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Response with partial support', [toolCallStep]),
        customInstructions: '',
      };

      const result = await evaluator(context);
      // Score should be geometric mean of [1.0, 0.9] = sqrt(0.9) ≈ 0.9487
      expect(result).toBeCloseTo(0.9487, 3);
    });

    it('returns 0 for contradicted central claim', async () => {
      const analysis = createMockGroundednessAnalysis('MAJOR_HALLUCINATIONS', [
        { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
        { verdict: 'CONTRADICTED', centrality: 'central' },
      ]);
      const mockClient = createMockInferenceClient(analysis);
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCallStep = createMockToolCallStep('tool-1', 'search', { data: 'test' });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Response with contradiction', [toolCallStep]),
        customInstructions: '',
      };

      const result = await evaluator(context);
      // Contradicted central claim has score 0.0, so geometric mean is 0
      expect(result).toBe(0.0);
    });

    it('handles peripheral contradictions better than central ones', async () => {
      const analysis = createMockGroundednessAnalysis('MINOR_HALLUCINATIONS', [
        { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
        { verdict: 'CONTRADICTED', centrality: 'peripheral' },
      ]);
      const mockClient = createMockInferenceClient(analysis);
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCallStep = createMockToolCallStep('tool-1', 'search', { data: 'test' });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Response with peripheral issue', [toolCallStep]),
        customInstructions: '',
      };

      const result = await evaluator(context);
      // Geometric mean of [1.0, 0.1] = sqrt(0.1) ≈ 0.3162
      expect(result).toBeCloseTo(0.3162, 3);
    });

    it('filters non-tool-call steps correctly', async () => {
      const analysis = createMockGroundednessAnalysis('GROUNDED', [{ verdict: 'FULLY_SUPPORTED' }]);
      const mockClient = createMockInferenceClient(analysis);
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCallStep = createMockToolCallStep('tool-1', 'search', { data: 'test' });
      const reasoningStep = {
        type: ConversationRoundStepType.reasoning as const,
        reasoning: 'Thinking...',
      };

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Response', [reasoningStep, toolCallStep]),
        customInstructions: '',
      };

      await evaluator(context);

      const callArg = (mockClient.prompt as jest.Mock).mock.calls[0][0];
      expect(callArg.input.tool_call_history).toContain('tool-1');
    });

    it('throws error when no tool call in LLM response', async () => {
      const mockClient = {
        prompt: jest.fn().mockResolvedValue({
          toolCalls: [],
        }),
      } as any;
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCallStep = createMockToolCallStep('tool-1', 'search', { data: 'test' });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Response', [toolCallStep]),
        customInstructions: '',
      };

      await expect(evaluator(context)).rejects.toThrow(
        'No tool call found in LLM response for groundedness evaluation'
      );
    });

    it('throws error when inference client fails', async () => {
      const mockClient = {
        prompt: jest.fn().mockRejectedValue(new Error('Network error')),
      } as any;
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCallStep = createMockToolCallStep('tool-1', 'search', { data: 'test' });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Response', [toolCallStep]),
        customInstructions: '',
      };

      await expect(evaluator(context)).rejects.toThrow('Network error');
      expect((logger.error as jest.Mock).mock.calls[0][0]).toContain(
        'Error in groundedness evaluation'
      );
    });

    it('calls inference client with correct parameters', async () => {
      const analysis = createMockGroundednessAnalysis('GROUNDED', [{ verdict: 'FULLY_SUPPORTED' }]);
      const mockClient = createMockInferenceClient(analysis);
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCallStep = createMockToolCallStep('tool-1', 'search', { result: 'test data' });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Agent response text', [toolCallStep]),
        customInstructions: '',
      };

      await evaluator(context);

      expect((mockClient.prompt as jest.Mock).mock.calls.length).toBe(1);
      const callArg = (mockClient.prompt as jest.Mock).mock.calls[0][0];
      expect(callArg.input.user_query).toBe('What is the company policy on parental leave?');
      expect(callArg.input.agent_response).toBe('Agent response text');
      expect(callArg.input.tool_call_history).toContain('tool-1');
    });

    it('handles multiple tool calls in history', async () => {
      const analysis = createMockGroundednessAnalysis('GROUNDED', [{ verdict: 'FULLY_SUPPORTED' }]);
      const mockClient = createMockInferenceClient(analysis);
      const evaluator = createGroundednessEvaluator({ inferenceClient: mockClient, logger });

      const toolCall1 = createMockToolCallStep('tool-1', 'search', { data: 'first' });
      const toolCall2 = createMockToolCallStep('tool-2', 'lookup', { data: 'second' });

      const context: EvaluatorContext = {
        conversation: createMockConversation(),
        currentRound: createMockRound('Response', [toolCall1, toolCall2]),
        customInstructions: '',
      };

      await evaluator(context);

      const callArgs = (mockClient.prompt as jest.Mock).mock.calls[0][0];
      const toolCallHistory = callArgs.input.tool_call_history;
      expect(toolCallHistory).toContain('tool-1');
      expect(toolCallHistory).toContain('tool-2');
    });
  });
});
