/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '../../types';

const TOOL_SELECTION_EVALUATOR_NAME = 'Tool Selection';
const TOOL_SELECTION_RECALL_EVALUATOR_NAME = 'Tool Selection Recall';
const TOOL_SELECTION_PRECISION_EVALUATOR_NAME = 'Tool Selection Precision';
const TOOL_SELECTION_ORDER_EVALUATOR_NAME = 'Tool Selection Order';

/**
 * Represents a tool call extracted from task output
 */
export interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
}

/**
 * Expected tool selection specification
 */
export interface ExpectedToolSelection {
  /**
   * List of expected tool names that should be called
   */
  tools: string[];
  /**
   * If true, the order of tool calls matters
   */
  orderMatters?: boolean;
  /**
   * If true, only the specified tools should be called (no extras)
   */
  exactMatch?: boolean;
}

/**
 * Configuration for the tool selection evaluator
 */
export interface ToolSelectionEvaluatorConfig<TOutput = unknown, TExpected = unknown> {
  /**
   * Function to extract tool calls from the task output
   */
  extractToolCalls: (output: TOutput) => ToolCall[];
  /**
   * Function to extract expected tool selection from the example's expected output
   */
  extractExpectedTools: (expected: TExpected) => ExpectedToolSelection;
}

/**
 * Default extractor that looks for common output shapes
 */
export function defaultExtractToolCalls(output: unknown): ToolCall[] {
  if (!output || typeof output !== 'object') {
    return [];
  }

  const outputObj = output as Record<string, unknown>;

  // Check for toolCalls array directly on output
  if (Array.isArray(outputObj.toolCalls)) {
    return outputObj.toolCalls.map((tc: unknown) => {
      if (typeof tc === 'string') {
        return { name: tc };
      }
      if (tc && typeof tc === 'object') {
        const toolCall = tc as Record<string, unknown>;
        return {
          name: String(toolCall.name || toolCall.tool || ''),
          args: (toolCall.args || toolCall.arguments || toolCall.input) as
            | Record<string, unknown>
            | undefined,
        };
      }
      return { name: '' };
    });
  }

  // Check for messages array with tool calls (common in chat/agent outputs)
  if (Array.isArray(outputObj.messages)) {
    const toolCalls: ToolCall[] = [];
    for (const message of outputObj.messages) {
      if (message && typeof message === 'object') {
        const msg = message as Record<string, unknown>;
        // Check for tool_calls in message
        if (Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            if (tc && typeof tc === 'object') {
              const toolCall = tc as Record<string, unknown>;
              const fn = toolCall.function as Record<string, unknown> | undefined;
              toolCalls.push({
                name: String(fn?.name || toolCall.name || ''),
                args: (fn?.arguments || toolCall.arguments) as Record<string, unknown> | undefined,
              });
            }
          }
        }
        // Check for tool invocations
        if (Array.isArray(msg.toolInvocations)) {
          for (const tc of msg.toolInvocations) {
            if (tc && typeof tc === 'object') {
              const toolCall = tc as Record<string, unknown>;
              toolCalls.push({
                name: String(toolCall.toolName || toolCall.name || ''),
                args: toolCall.args as Record<string, unknown> | undefined,
              });
            }
          }
        }
      }
    }
    return toolCalls;
  }

  return [];
}

/**
 * Default extractor for expected tools from the example's expected output
 */
export function defaultExtractExpectedTools(expected: unknown): ExpectedToolSelection {
  if (!expected || typeof expected !== 'object') {
    return { tools: [] };
  }

  const expectedObj = expected as Record<string, unknown>;

  // Check for expectedTools object
  if (expectedObj.expectedTools && typeof expectedObj.expectedTools === 'object') {
    const toolsSpec = expectedObj.expectedTools as ExpectedToolSelection;
    return {
      tools: Array.isArray(toolsSpec.tools) ? toolsSpec.tools : [],
      orderMatters: toolsSpec.orderMatters,
      exactMatch: toolsSpec.exactMatch,
    };
  }

  // Check for tools array directly
  if (Array.isArray(expectedObj.tools)) {
    return {
      tools: expectedObj.tools.filter((t): t is string => typeof t === 'string'),
      orderMatters: expectedObj.orderMatters === true,
      exactMatch: expectedObj.exactMatch === true,
    };
  }

  // Check for tool (single tool)
  if (typeof expectedObj.tool === 'string') {
    return {
      tools: [expectedObj.tool],
      exactMatch: true,
    };
  }

  return { tools: [] };
}

/**
 * Computes tool selection metrics
 */
interface ToolSelectionMetrics {
  /** Number of expected tools that were called */
  hits: number;
  /** Total number of expected tools */
  totalExpected: number;
  /** Total number of actual tool calls */
  totalActual: number;
  /** Recall: hits / totalExpected */
  recall: number;
  /** Precision: hits / totalActual */
  precision: number;
  /** F1 score */
  f1: number;
  /** Whether all expected tools were called in the correct order */
  orderCorrect: boolean;
  /** Whether exactly the expected tools were called (no extras) */
  exactMatch: boolean;
  /** Tools that were expected but not called */
  missingTools: string[];
  /** Tools that were called but not expected */
  extraTools: string[];
  /** Actual tool names in order */
  actualTools: string[];
  /** Expected tool names in order */
  expectedTools: string[];
}

function computeToolSelectionMetrics(
  actualCalls: ToolCall[],
  expected: ExpectedToolSelection
): ToolSelectionMetrics {
  const actualTools = actualCalls.map((tc) => tc.name).filter(Boolean);
  const expectedTools = expected.tools;

  const actualSet = new Set(actualTools);
  const expectedSet = new Set(expectedTools);

  // Calculate hits (expected tools that were called)
  const hits = expectedTools.filter((tool) => actualSet.has(tool)).length;

  // Calculate missing and extra tools
  const missingTools = expectedTools.filter((tool) => !actualSet.has(tool));
  const extraTools = actualTools.filter((tool) => !expectedSet.has(tool));

  // Calculate metrics
  const totalExpected = expectedTools.length;
  const totalActual = actualTools.length;

  const recall = totalExpected > 0 ? hits / totalExpected : 0;
  const precision = totalActual > 0 ? hits / totalActual : totalExpected === 0 ? 1 : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Check order correctness (only for expected tools that were called)
  let orderCorrect = true;
  if (expected.orderMatters && hits > 0) {
    let lastIndex = -1;
    for (const expectedTool of expectedTools) {
      const index = actualTools.indexOf(expectedTool);
      if (index !== -1) {
        if (index <= lastIndex) {
          orderCorrect = false;
          break;
        }
        lastIndex = index;
      }
    }
  }

  // Check exact match
  const exactMatch = missingTools.length === 0 && extraTools.length === 0;

  return {
    hits,
    totalExpected,
    totalActual,
    recall,
    precision,
    f1,
    orderCorrect,
    exactMatch,
    missingTools,
    extraTools,
    actualTools,
    expectedTools,
  };
}

/**
 * Creates a tool selection evaluator that verifies the correct tool(s) were selected.
 *
 * Returns a score of 1 if all expected tools were called (optionally in order and without extras),
 * otherwise returns a score between 0 and 1 based on recall.
 */
export function createToolSelectionEvaluator<TOutput = unknown, TExpected = unknown>(
  config?: Partial<ToolSelectionEvaluatorConfig<TOutput, TExpected>>
): Evaluator {
  const extractToolCalls = config?.extractToolCalls ?? defaultExtractToolCalls;
  const extractExpectedTools = config?.extractExpectedTools ?? defaultExtractExpectedTools;

  return {
    name: TOOL_SELECTION_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let actualCalls: ToolCall[];
      let expectedSelection: ExpectedToolSelection;

      try {
        actualCalls = extractToolCalls(output as TOutput);
        expectedSelection = extractExpectedTools(expected as TExpected);
      } catch (error) {
        return {
          score: null,
          label: 'error',
          explanation: `Failed to extract tools: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (expectedSelection.tools.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No expected tools specified in the example',
        };
      }

      const metrics = computeToolSelectionMetrics(actualCalls, expectedSelection);

      // Determine score based on configuration
      let score: number;
      let label: string;

      if (expectedSelection.exactMatch && expectedSelection.orderMatters) {
        // Strictest: exact match AND correct order
        score = metrics.exactMatch && metrics.orderCorrect ? 1 : 0;
        label = score === 1 ? 'pass' : 'fail';
      } else if (expectedSelection.exactMatch) {
        // Exact match required (no extra tools)
        score = metrics.exactMatch ? 1 : metrics.f1;
        label = metrics.exactMatch ? 'pass' : 'partial';
      } else if (expectedSelection.orderMatters) {
        // Order matters but extra tools are OK
        score = metrics.recall === 1 && metrics.orderCorrect ? 1 : metrics.recall;
        label =
          metrics.recall === 1 && metrics.orderCorrect
            ? 'pass'
            : metrics.recall > 0
            ? 'partial'
            : 'fail';
      } else {
        // Default: just check if expected tools were called (recall)
        score = metrics.recall;
        label = metrics.recall === 1 ? 'pass' : metrics.recall > 0 ? 'partial' : 'fail';
      }

      const explanationParts: string[] = [];
      explanationParts.push(
        `${metrics.hits}/${metrics.totalExpected} expected tools called (${(
          metrics.recall * 100
        ).toFixed(0)}%)`
      );

      if (metrics.missingTools.length > 0) {
        explanationParts.push(`Missing: ${metrics.missingTools.join(', ')}`);
      }
      if (metrics.extraTools.length > 0 && expectedSelection.exactMatch) {
        explanationParts.push(`Extra: ${metrics.extraTools.join(', ')}`);
      }
      if (expectedSelection.orderMatters && !metrics.orderCorrect) {
        explanationParts.push('Order incorrect');
      }

      return {
        score,
        label,
        explanation: explanationParts.join('. '),
        metadata: {
          actualTools: metrics.actualTools,
          expectedTools: metrics.expectedTools,
          missingTools: metrics.missingTools,
          extraTools: metrics.extraTools,
          recall: metrics.recall,
          precision: metrics.precision,
          f1: metrics.f1,
          orderCorrect: metrics.orderCorrect,
          exactMatch: metrics.exactMatch,
        },
      };
    },
  };
}

/**
 * Creates a tool selection recall evaluator.
 * Measures what fraction of expected tools were actually called.
 */
export function createToolSelectionRecallEvaluator<TOutput = unknown, TExpected = unknown>(
  config?: Partial<ToolSelectionEvaluatorConfig<TOutput, TExpected>>
): Evaluator {
  const extractToolCalls = config?.extractToolCalls ?? defaultExtractToolCalls;
  const extractExpectedTools = config?.extractExpectedTools ?? defaultExtractExpectedTools;

  return {
    name: TOOL_SELECTION_RECALL_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let actualCalls: ToolCall[];
      let expectedSelection: ExpectedToolSelection;

      try {
        actualCalls = extractToolCalls(output as TOutput);
        expectedSelection = extractExpectedTools(expected as TExpected);
      } catch (error) {
        return {
          score: null,
          label: 'error',
          explanation: `Failed to extract tools: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (expectedSelection.tools.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No expected tools specified in the example',
        };
      }

      const metrics = computeToolSelectionMetrics(actualCalls, expectedSelection);

      return {
        score: metrics.recall,
        explanation: `${metrics.hits} of ${metrics.totalExpected} expected tools called (Recall: ${(
          metrics.recall * 100
        ).toFixed(1)}%)`,
        metadata: {
          hits: metrics.hits,
          totalExpected: metrics.totalExpected,
          missingTools: metrics.missingTools,
        },
      };
    },
  };
}

/**
 * Creates a tool selection precision evaluator.
 * Measures what fraction of called tools were expected.
 */
export function createToolSelectionPrecisionEvaluator<TOutput = unknown, TExpected = unknown>(
  config?: Partial<ToolSelectionEvaluatorConfig<TOutput, TExpected>>
): Evaluator {
  const extractToolCalls = config?.extractToolCalls ?? defaultExtractToolCalls;
  const extractExpectedTools = config?.extractExpectedTools ?? defaultExtractExpectedTools;

  return {
    name: TOOL_SELECTION_PRECISION_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let actualCalls: ToolCall[];
      let expectedSelection: ExpectedToolSelection;

      try {
        actualCalls = extractToolCalls(output as TOutput);
        expectedSelection = extractExpectedTools(expected as TExpected);
      } catch (error) {
        return {
          score: null,
          label: 'error',
          explanation: `Failed to extract tools: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (expectedSelection.tools.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No expected tools specified in the example',
        };
      }

      const metrics = computeToolSelectionMetrics(actualCalls, expectedSelection);

      return {
        score: metrics.precision,
        explanation: `${metrics.hits} of ${
          metrics.totalActual
        } tool calls were expected (Precision: ${(metrics.precision * 100).toFixed(1)}%)`,
        metadata: {
          hits: metrics.hits,
          totalActual: metrics.totalActual,
          extraTools: metrics.extraTools,
        },
      };
    },
  };
}

/**
 * Creates a tool selection order evaluator.
 * Returns 1 if expected tools were called in the correct order, 0 otherwise.
 */
export function createToolSelectionOrderEvaluator<TOutput = unknown, TExpected = unknown>(
  config?: Partial<ToolSelectionEvaluatorConfig<TOutput, TExpected>>
): Evaluator {
  const extractToolCalls = config?.extractToolCalls ?? defaultExtractToolCalls;
  const extractExpectedTools = config?.extractExpectedTools ?? defaultExtractExpectedTools;

  return {
    name: TOOL_SELECTION_ORDER_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let actualCalls: ToolCall[];
      let expectedSelection: ExpectedToolSelection;

      try {
        actualCalls = extractToolCalls(output as TOutput);
        expectedSelection = extractExpectedTools(expected as TExpected);
      } catch (error) {
        return {
          score: null,
          label: 'error',
          explanation: `Failed to extract tools: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (expectedSelection.tools.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No expected tools specified in the example',
        };
      }

      // Force orderMatters for this evaluator
      const metricsSelection = { ...expectedSelection, orderMatters: true };
      const metrics = computeToolSelectionMetrics(actualCalls, metricsSelection);

      // Only meaningful if at least some expected tools were called
      if (metrics.hits === 0) {
        return {
          score: 0,
          label: 'fail',
          explanation: 'No expected tools were called',
          metadata: {
            actualTools: metrics.actualTools,
            expectedTools: metrics.expectedTools,
          },
        };
      }

      return {
        score: metrics.orderCorrect ? 1 : 0,
        label: metrics.orderCorrect ? 'pass' : 'fail',
        explanation: metrics.orderCorrect
          ? 'Expected tools were called in the correct order'
          : 'Expected tools were called out of order',
        metadata: {
          actualTools: metrics.actualTools,
          expectedTools: metrics.expectedTools,
          orderCorrect: metrics.orderCorrect,
        },
      };
    },
  };
}

/**
 * Creates all tool selection evaluators with shared configuration.
 */
export function createToolSelectionEvaluators<TOutput = unknown, TExpected = unknown>(
  config?: Partial<ToolSelectionEvaluatorConfig<TOutput, TExpected>>
): Evaluator[] {
  return [
    createToolSelectionEvaluator(config),
    createToolSelectionRecallEvaluator(config),
    createToolSelectionPrecisionEvaluator(config),
    createToolSelectionOrderEvaluator(config),
  ];
}
