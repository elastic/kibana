/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import type { AgentExecutionEvent } from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { ProcessedUserMessageEvent, ProcessedTimelineEvent } from './prepare_conversation';
import {
  computeContextBudget,
  estimateEventTokens,
  estimateTimelineTokens,
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

const createMockEvents = (
  messageLength: number,
  toolResults: number = 0
): ProcessedTimelineEvent[] => {
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

  const userEvent: ProcessedUserMessageEvent = {
    id: 'msg-round-1',
    timestamp: new Date().toISOString(),
    type: TimelineEventType.user_message,
    user: { id: 'user-1', username: 'test-user' },
    message: 'x'.repeat(messageLength),
    processedInput: {
      message: 'x'.repeat(messageLength),
      attachments: [],
    },
  };

  const agentEvent: AgentExecutionEvent = {
    id: 'round-1',
    timestamp: new Date().toISOString(),
    type: TimelineEventType.agentExecution,
    agent_id: 'agent-1',
    status: ConversationRoundStatus.completed,
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

  return [userEvent, agentEvent];
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

describe('estimateEventTokens', () => {
  it('should estimate tokens for a simple event pair', () => {
    const events = createMockEvents(400);
    const userTokens = estimateEventTokens(events[0]);
    const agentTokens = estimateEventTokens(events[1]);

    // 400 chars / 4 = 100 tokens for message + overhead per event
    expect(userTokens).toBeGreaterThan(100);
    expect(agentTokens).toBeGreaterThan(100);
  });

  it('should include tool results in estimation', () => {
    const eventsWithTools = createMockEvents(400, 3);
    const eventsWithoutTools = createMockEvents(400, 0);

    // Compare the agent response events (index 1) which contain the steps
    expect(estimateEventTokens(eventsWithTools[1])).toBeGreaterThan(
      estimateEventTokens(eventsWithoutTools[1])
    );
  });
});

describe('estimateTimelineTokens', () => {
  it('should sum tokens across all events', () => {
    const events = [...createMockEvents(400), ...createMockEvents(800), ...createMockEvents(200)];
    const total = estimateTimelineTokens(events);

    expect(total).toBeGreaterThan(0);
    expect(total).toBe(events.reduce((sum, e) => sum + estimateEventTokens(e), 0));
  });

  it('should return 0 for empty events', () => {
    expect(estimateTimelineTokens([])).toBe(0);
  });
});

describe('shouldTriggerCompaction', () => {
  it('should not trigger for small conversations', () => {
    const connector = createMockConnector(128000);
    const budget = computeContextBudget(connector);
    const events = createMockEvents(100);

    expect(shouldTriggerCompaction(events, budget)).toBe(false);
  });

  it('should trigger when conversation exceeds threshold', () => {
    const connector = createMockConnector(1000); // very small window for testing
    const budget = computeContextBudget(connector);
    // Create events with enough text to exceed the threshold
    const events = [
      ...createMockEvents(2000),
      ...createMockEvents(2000),
      ...createMockEvents(2000),
    ];

    expect(shouldTriggerCompaction(events, budget)).toBe(true);
  });
});
