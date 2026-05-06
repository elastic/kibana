/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { ProcessedConversationRound } from './prepare_conversation';
import {
  computeContextBudget,
  estimateRoundTokens,
  estimateConversationTokens,
  shouldTriggerCompaction,
} from './context_budget';

const createMockConnector = (contextWindowSize?: number): InferenceConnector => ({
  type: InferenceConnectorType.OpenAI,
  isInferenceEndpoint: false,
  isPreconfigured: false,
  name: 'test-connector',
  connectorId: 'test-id',
  config: {
    ...(contextWindowSize !== undefined ? { contextWindowLength: contextWindowSize } : {}),
  },
  capabilities: {
    ...(contextWindowSize !== undefined ? { contextWindowSize } : {}),
  },
});

const createMockRound = (
  messageLength: number,
  toolResults: number = 0
): ProcessedConversationRound => {
  const steps = Array.from({ length: toolResults }, (_, i) => ({
    type: ConversationRoundStepType.toolCall as const,
    tool_call_id: `tc-${i}`,
    tool_id: `tool-${i}`,
    params: { query: 'test' },
    results: [
      { type: 'other' as const, tool_result_id: `result-${i}`, data: { value: 'x'.repeat(100) } },
    ],
    progression: [],
  }));

  return {
    id: 'round-1',
    status: ConversationRoundStatus.completed,
    input: {
      message: 'x'.repeat(messageLength),
      attachments: [],
    },
    steps,
    response: { message: 'y'.repeat(messageLength) },
    started_at: new Date().toISOString(),
    time_to_first_token: 100,
    time_to_last_token: 200,
    model_usage: {
      connector_id: 'test-connector',
      llm_calls: 1,
      input_tokens: 100,
      output_tokens: 50,
    },
  };
};

describe('computeContextBudget', () => {
  it('should compute budget from connector context window size', () => {
    const connector = createMockConnector(128000);
    const budget = computeContextBudget(connector);

    expect(budget.totalBudget).toBe(128000);
    expect(budget.historyBudget).toBe(89600); // 128000 * 0.7 (1 - RESERVED_FRACTION)
    expect(budget.triggerThreshold).toBe(71680); // 89600 * 0.8 (TRIGGER_FRACTION)
  });

  it('should use default context window when connector has no size', () => {
    const connector = createMockConnector();
    // Override config to not have contextWindowLength
    connector.config = {};
    const budget = computeContextBudget(connector);

    expect(budget.totalBudget).toBe(128000); // default
    expect(budget.historyBudget).toBe(89600); // 128000 * 0.7
    expect(budget.triggerThreshold).toBe(71680); // 89600 * 0.8
  });

  it('should scale with large context windows', () => {
    const connector = createMockConnector(1000000);
    const budget = computeContextBudget(connector);

    expect(budget.totalBudget).toBe(1000000);
    expect(budget.historyBudget).toBe(700000); // 1000000 * 0.7
    expect(budget.triggerThreshold).toBe(560000); // 700000 * 0.8
  });
});

describe('estimateRoundTokens', () => {
  it('should estimate tokens for a simple round', () => {
    const round = createMockRound(400);
    const tokens = estimateRoundTokens(round);

    // 400 chars / 4 = 100 tokens for message + 100 for response + overhead
    expect(tokens).toBeGreaterThan(200);
  });

  it('should include tool results in estimation', () => {
    const roundWithTools = createMockRound(400, 3);
    const roundWithoutTools = createMockRound(400, 0);

    expect(estimateRoundTokens(roundWithTools)).toBeGreaterThan(
      estimateRoundTokens(roundWithoutTools)
    );
  });
});

describe('estimateConversationTokens', () => {
  it('should sum tokens across all rounds', () => {
    const rounds = [createMockRound(400), createMockRound(800), createMockRound(200)];
    const total = estimateConversationTokens(rounds);

    expect(total).toBeGreaterThan(0);
    expect(total).toBe(rounds.reduce((sum, r) => sum + estimateRoundTokens(r), 0));
  });

  it('should return 0 for empty rounds', () => {
    expect(estimateConversationTokens([])).toBe(0);
  });
});

describe('shouldTriggerCompaction', () => {
  it('should not trigger for small conversations', () => {
    const connector = createMockConnector(128000);
    const budget = computeContextBudget(connector);
    const rounds = [createMockRound(100)];

    expect(shouldTriggerCompaction(rounds, budget)).toBe(false);
  });

  it('should trigger when conversation exceeds threshold', () => {
    const connector = createMockConnector(1000); // very small window for testing
    const budget = computeContextBudget(connector);
    // Create rounds with enough text to exceed the threshold
    const rounds = [createMockRound(2000), createMockRound(2000), createMockRound(2000)];

    expect(shouldTriggerCompaction(rounds, budget)).toBe(true);
  });
});
