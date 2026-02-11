/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ToolCallStep, ToolResult } from '@kbn/agent-builder-common';
import {
  platformCoreTools,
  ConversationRoundStepType,
  ConversationRoundStatus,
} from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { InternalToolDefinition, ToolReturnSummarizerFn } from '@kbn/agent-builder-server';
import type { ToolRegistry } from '../../../tools';
import {
  cleanToolCallHistory,
  isCleanedResult,
  estimateCleaningSavings,
} from './clean_tool_history';

// Helper to create a tool call step
const createToolCallStep = (toolId: string, results: ToolResult[]): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_id: toolId,
  tool_call_id: 'call-123',
  params: {},
  results,
});

// Helper to create a round
const createRound = (steps: ToolCallStep[]): ConversationRound => ({
  id: 'round-1',
  input: { message: 'test message' },
  response: { message: 'test response' },
  steps,
  started_at: new Date().toISOString(),
  time_to_first_token: 100,
  time_to_last_token: 200,
  model_usage: { connector_id: 'test', llm_calls: 1, input_tokens: 100, output_tokens: 50 },
  status: ConversationRoundStatus.completed,
});

// Helper to create a tool result
const createToolResult = (data: Record<string, unknown>): ToolResult => ({
  tool_result_id: 'result-123',
  type: ToolResultType.other,
  data,
});

// Mock cleaner that generates a summary
const createMockCleaner =
  (prefix: string): ToolReturnSummarizerFn =>
  (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (result.type !== ToolResultType.other) return undefined;
    const data = result.data as Record<string, unknown>;

    return [
      {
        ...result,
        data: {
          summary: `${prefix}: ${data.attachment_id || 'unknown'}`,
          attachment_id: data.attachment_id,
          type: data.type,
        },
      },
    ];
  };

// Create a mock tool registry
const createMockToolRegistry = (cleaners: Map<string, ToolReturnSummarizerFn>): ToolRegistry => {
  return {
    has: jest.fn(async (toolId: string) => cleaners.has(toolId)),
    get: jest.fn(async (toolId: string) => {
      const cleaner = cleaners.get(toolId);
      if (!cleaner) {
        throw new Error(`Tool not found: ${toolId}`);
      }
      return {
        id: toolId,
        summarizeToolReturn: cleaner,
      } as unknown as InternalToolDefinition;
    }),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    execute: jest.fn(),
  } as unknown as ToolRegistry;
};

// Create a registry with mock cleaners for all attachment tools
const createMockCleaners = (): Map<string, ToolReturnSummarizerFn> => {
  const cleaners = new Map<string, ToolReturnSummarizerFn>();

  cleaners.set(platformCoreTools.attachmentRead, createMockCleaner('Read'));
  cleaners.set(platformCoreTools.attachmentUpdate, createMockCleaner('Updated'));
  cleaners.set(platformCoreTools.attachmentAdd, createMockCleaner('Added'));
  cleaners.set(platformCoreTools.attachmentList, (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (result.type !== ToolResultType.other) return undefined;
    const data = result.data as Record<string, unknown>;

    return [
      {
        ...result,
        data: {
          summary: `Listed ${data.count ?? '?'} attachments`,
          count: data.count,
        },
      },
    ];
  });
  cleaners.set(platformCoreTools.attachmentDiff, (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (result.type !== ToolResultType.other) return undefined;
    const data = result.data as Record<string, unknown>;

    return [
      {
        ...result,
        data: {
          summary: `Compared ${data.attachment_id} v${data.from_version} to v${data.to_version}`,
          attachment_id: data.attachment_id,
          from_version: data.from_version,
          to_version: data.to_version,
        },
      },
    ];
  });
  cleaners.set(platformCoreTools.createVisualization, (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (result.type !== ToolResultType.other) return undefined;

    return [
      {
        ...result,
        data: {
          summary: 'Created visualization',
        },
      },
    ];
  });

  return cleaners;
};

describe('clean_tool_history', () => {
  describe('isCleanedResult', () => {
    it('should return false for non-object values', () => {
      expect(isCleanedResult(null)).toBe(false);
      expect(isCleanedResult(undefined)).toBe(false);
      expect(isCleanedResult('string')).toBe(false);
      expect(isCleanedResult(123)).toBe(false);
    });

    it('should return false for objects without cleaned marker', () => {
      expect(isCleanedResult({})).toBe(false);
      expect(isCleanedResult({ data: 'test' })).toBe(false);
    });

    it('should return false for objects with incorrect marker value', () => {
      expect(isCleanedResult({ __cleaned__: false })).toBe(false);
      expect(isCleanedResult({ __cleaned__: 'yes' })).toBe(false);
    });

    it('should return true for objects with correct cleaned marker', () => {
      expect(isCleanedResult({ __cleaned__: true })).toBe(true);
      expect(isCleanedResult({ __cleaned__: true, summary: 'test' })).toBe(true);
    });
  });

  describe('cleanToolCallHistory', () => {
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
      toolRegistry = createMockToolRegistry(createMockCleaners());
    });

    it('should return empty array for empty input', async () => {
      expect(await cleanToolCallHistory([], toolRegistry)).toEqual([]);
    });

    it('should not modify rounds without tool calls', async () => {
      const rounds = [createRound([])];
      const result = await cleanToolCallHistory(rounds, toolRegistry);

      expect(result).toHaveLength(1);
      expect(result[0].steps).toHaveLength(0);
    });

    it('should not modify non-registered tool calls', async () => {
      const results = [createToolResult({ some: 'data', nested: { deep: 'value' } })];
      const step = createToolCallStep('some.other.tool', results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, toolRegistry);

      // Should be unchanged because 'some.other.tool' has no cleaner registered
      expect(result[0].steps[0]).toEqual(step);
    });

    it('should clean attachment_read tool results', async () => {
      const results = [
        createToolResult({
          attachment_id: 'att-123',
          type: 'text',
          version: 2,
          content: 'This is a very long content that should be cleaned'.repeat(100),
        }),
      ];
      const step = createToolCallStep(platformCoreTools.attachmentRead, results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, toolRegistry);
      const cleanedStep = result[0].steps[0] as ToolCallStep;
      const cleanedResult = cleanedStep.results[0] as ToolResult;
      const cleanedData = cleanedResult.data as Record<string, unknown>;

      expect(cleanedData.__cleaned__).toBe(true);
      expect(cleanedData.summary).toContain('Read');
      expect(cleanedData.summary).toContain('att-123');
      expect(cleanedData.attachment_id).toBe('att-123');
      expect(cleanedData.type).toBe('text');
      expect(cleanedData).not.toHaveProperty('content');
    });

    it('should clean attachment_update tool results', async () => {
      const results = [
        createToolResult({
          attachment_id: 'att-456',
          type: 'json',
          previous_version: 1,
          version: 2,
          version_created: true,
        }),
      ];
      const step = createToolCallStep(platformCoreTools.attachmentUpdate, results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, toolRegistry);
      const cleanedStep = result[0].steps[0] as ToolCallStep;
      const cleanedResult = cleanedStep.results[0] as ToolResult;
      const cleanedData = cleanedResult.data as Record<string, unknown>;

      expect(cleanedData.__cleaned__).toBe(true);
      expect(cleanedData.summary).toContain('Updated');
      expect(cleanedData.summary).toContain('att-456');
    });

    it('should clean attachment_add tool results', async () => {
      const results = [
        createToolResult({
          attachment_id: 'new-att',
          type: 'visualization_ref',
          version: 1,
        }),
      ];
      const step = createToolCallStep(platformCoreTools.attachmentAdd, results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, toolRegistry);
      const cleanedStep = result[0].steps[0] as ToolCallStep;
      const cleanedResult = cleanedStep.results[0] as ToolResult;
      const cleanedData = cleanedResult.data as Record<string, unknown>;

      expect(cleanedData.__cleaned__).toBe(true);
      expect(cleanedData.summary).toContain('Added');
      expect(cleanedData.summary).toContain('new-att');
    });

    it('should clean attachment_list tool results', async () => {
      const results = [
        createToolResult({
          count: 5,
          attachments: [{}, {}, {}, {}, {}],
        }),
      ];
      const step = createToolCallStep(platformCoreTools.attachmentList, results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, toolRegistry);
      const cleanedStep = result[0].steps[0] as ToolCallStep;
      const cleanedResult = cleanedStep.results[0] as ToolResult;
      const cleanedData = cleanedResult.data as Record<string, unknown>;

      expect(cleanedData.__cleaned__).toBe(true);
      expect(cleanedData.summary).toContain('Listed');
      expect(cleanedData.summary).toContain('5');
    });

    it('should clean attachment_diff tool results', async () => {
      const results = [
        createToolResult({
          attachment_id: 'diff-att',
          from_version: 1,
          to_version: 3,
          change_type: 'modified',
          diff: 'Large diff content...',
        }),
      ];
      const step = createToolCallStep(platformCoreTools.attachmentDiff, results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, toolRegistry);
      const cleanedStep = result[0].steps[0] as ToolCallStep;
      const cleanedResult = cleanedStep.results[0] as ToolResult;
      const cleanedData = cleanedResult.data as Record<string, unknown>;

      expect(cleanedData.__cleaned__).toBe(true);
      expect(cleanedData.summary).toContain('Compared');
      expect(cleanedData.summary).toContain('diff-att');
      expect(cleanedData.summary).toContain('v1');
      expect(cleanedData.summary).toContain('v3');
    });

    it('should clean create_visualization tool results', async () => {
      const results = [
        createToolResult({
          visualization: { large: 'content' },
        }),
      ];
      const step = createToolCallStep(platformCoreTools.createVisualization, results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, toolRegistry);
      const cleanedStep = result[0].steps[0] as ToolCallStep;
      const cleanedResult = cleanedStep.results[0] as ToolResult;
      const cleanedData = cleanedResult.data as Record<string, unknown>;

      expect(cleanedData.__cleaned__).toBe(true);
      expect(cleanedData.summary).toContain('visualization');
    });

    it('should not double-clean already cleaned results', async () => {
      const results = [
        createToolResult({
          __cleaned__: true,
          summary: 'Already cleaned',
          attachment_id: 'att-123',
        }),
      ];
      const step = createToolCallStep(platformCoreTools.attachmentRead, results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, toolRegistry);
      const cleanedStep = result[0].steps[0] as ToolCallStep;
      const cleanedResult = cleanedStep.results[0] as ToolResult;
      const cleanedData = cleanedResult.data as Record<string, unknown>;

      expect(cleanedData.__cleaned__).toBe(true);
      expect(cleanedData.summary).toBe('Already cleaned');
    });

    it('should handle multiple rounds', async () => {
      const round1 = createRound([
        createToolCallStep(platformCoreTools.attachmentRead, [
          createToolResult({ attachment_id: 'att-1', type: 'text', version: 1 }),
        ]),
      ]);
      const round2 = createRound([
        createToolCallStep(platformCoreTools.attachmentUpdate, [
          createToolResult({ attachment_id: 'att-1', version: 2, version_created: true }),
        ]),
      ]);

      const result = await cleanToolCallHistory([round1, round2], toolRegistry);

      expect(result).toHaveLength(2);

      const step1 = result[0].steps[0] as ToolCallStep;
      const data1 = (step1.results[0] as ToolResult).data as Record<string, unknown>;
      expect(data1.__cleaned__).toBe(true);

      const step2 = result[1].steps[0] as ToolCallStep;
      const data2 = (step2.results[0] as ToolResult).data as Record<string, unknown>;
      expect(data2.__cleaned__).toBe(true);
    });

    it('should preserve non-tool-call steps', async () => {
      const round: ConversationRound = {
        ...createRound([]),
        steps: [
          { type: ConversationRoundStepType.reasoning, reasoning: 'thinking...' },
          createToolCallStep(platformCoreTools.attachmentRead, [
            createToolResult({ attachment_id: 'att-1', type: 'text', version: 1 }),
          ]),
        ],
      };

      const result = await cleanToolCallHistory([round], toolRegistry);

      expect(result[0].steps).toHaveLength(2);
      expect(result[0].steps[0].type).toBe(ConversationRoundStepType.reasoning);
      expect((result[0].steps[1] as ToolCallStep).tool_id).toBe(platformCoreTools.attachmentRead);
    });

    it('should work with empty registry (no cleaning)', async () => {
      const emptyRegistry = createMockToolRegistry(new Map());
      const results = [
        createToolResult({
          attachment_id: 'att-123',
          type: 'text',
          content: 'This should not be cleaned',
        }),
      ];
      const step = createToolCallStep(platformCoreTools.attachmentRead, results);
      const rounds = [createRound([step])];

      const result = await cleanToolCallHistory(rounds, emptyRegistry);
      const cleanedStep = result[0].steps[0] as ToolCallStep;
      const cleanedResult = cleanedStep.results[0] as ToolResult;
      const cleanedData = cleanedResult.data as Record<string, unknown>;

      // Should not be cleaned because no cleaner is registered
      expect(cleanedData.__cleaned__).toBeUndefined();
      expect(cleanedData.content).toBe('This should not be cleaned');
    });
  });

  describe('estimateCleaningSavings', () => {
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
      toolRegistry = createMockToolRegistry(createMockCleaners());
    });

    it('should return zero savings for empty rounds', () => {
      const result = estimateCleaningSavings([], []);

      expect(result.originalTokens).toBe(0);
      expect(result.cleanedTokens).toBe(0);
      expect(result.savedTokens).toBe(0);
    });

    it('should calculate token savings correctly', async () => {
      const largeContent = 'x'.repeat(4000); // ~1000 tokens
      const originalRounds = [
        createRound([
          createToolCallStep(platformCoreTools.attachmentRead, [
            createToolResult({ attachment_id: 'att-1', content: largeContent }),
          ]),
        ]),
      ];

      const cleanedRounds = await cleanToolCallHistory(originalRounds, toolRegistry);
      const result = estimateCleaningSavings(originalRounds, cleanedRounds);

      expect(result.originalTokens).toBeGreaterThan(result.cleanedTokens);
      expect(result.savedTokens).toBeGreaterThan(0);
      expect(result.savedTokens).toBe(result.originalTokens - result.cleanedTokens);
    });

    it('should show significant savings for large attachments', async () => {
      const largeContent = 'x'.repeat(40000); // ~10000 tokens
      const originalRounds = [
        createRound([
          createToolCallStep(platformCoreTools.attachmentRead, [
            createToolResult({ attachment_id: 'att-1', content: largeContent }),
          ]),
        ]),
      ];

      const cleanedRounds = await cleanToolCallHistory(originalRounds, toolRegistry);
      const result = estimateCleaningSavings(originalRounds, cleanedRounds);

      // Expect at least 90% reduction for large content
      const savingsPercentage = (result.savedTokens / result.originalTokens) * 100;
      expect(savingsPercentage).toBeGreaterThan(90);
    });
  });
});
