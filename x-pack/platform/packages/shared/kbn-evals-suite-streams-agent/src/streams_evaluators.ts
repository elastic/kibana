/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTrajectoryEvaluator, type Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';

const PLATFORM_TOOL_IDS = new Set(['filestore.read']);

const MAX_PARAM_LOG_LENGTH = 300;

interface ToolCallStep {
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

/**
 * Extract tool call steps from raw output, preserving `params` alongside
 * `tool_id` and `results`.
 */
const getRawToolCallSteps = (output: unknown): ToolCallStep[] => {
  const steps =
    (
      output as {
        steps?: Array<{ type?: string; tool_id?: string; params?: Record<string, unknown>; results?: unknown[] }>;
      }
    )?.steps ?? [];

  return steps
    .filter((s) => s?.type === 'tool_call')
    .map((s) => ({ tool_id: s.tool_id, params: s.params, results: s.results }));
};

const getSkillToolCallSteps = (output: unknown): ToolCallStep[] => {
  return getRawToolCallSteps(output).filter((s) => !PLATFORM_TOOL_IDS.has(s.tool_id ?? ''));
};

const truncate = (value: unknown, maxLen: number): string => {
  const str = JSON.stringify(value);
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
};

/**
 * Log tool calls with their parameters from a converse response.
 * Logs the resource identifier for filestore.read and params for all skill tools.
 */
export const logConverseResponse = (
  log: ToolingLog,
  label: string,
  response: { messages?: Array<{ message: string }>; steps?: unknown[]; errors?: unknown[] }
) => {
  const steps = (response.steps ?? []) as Array<Record<string, unknown>>;
  const toolCalls = steps.filter((s) => s?.type === 'tool_call');
  const skillToolCalls = toolCalls.filter(
    (s) => !PLATFORM_TOOL_IDS.has((s.tool_id as string) ?? '')
  );
  const skillToolIds = skillToolCalls.map((s) => s.tool_id ?? '(missing)');

  const filestoreCall = toolCalls.find((s) => s.tool_id === 'filestore.read');
  if (filestoreCall) {
    const params = filestoreCall.params as Record<string, unknown> | undefined;
    log.info(`[${label}] skill loaded: ${params?.name ?? params?.path ?? '(unknown)'}`);
  } else {
    log.warning(`[${label}] filestore.read NOT called — skill may not be loaded`);
  }

  log.info(`[${label}] tool calls (${skillToolCalls.length}): [${skillToolIds.join(', ')}]`);

  for (const tc of skillToolCalls) {
    const params = tc.params as Record<string, unknown> | undefined;
    if (params) {
      log.info(`[${label}]   ${tc.tool_id}: ${truncate(params, MAX_PARAM_LOG_LENGTH)}`);
    }
  }

  const lastMessage = response.messages?.[response.messages.length - 1]?.message ?? '';
  log.debug(`[${label}] response: ${lastMessage.slice(0, 500)}`);

  if (response.errors?.length) {
    log.warning(`[${label}] errors: ${JSON.stringify(response.errors)}`);
  }
};

/**
 * Scores 1.0 if total skill tool calls <= maxExpectedToolCalls, 0.0 otherwise.
 * Platform tools (filestore.read) are excluded from the count.
 */
export const createToolCallBudgetEvaluator = (): Evaluator => ({
  name: 'ToolCallBudget',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const steps = getSkillToolCallSteps(output);
    const actual = steps.length;
    const max = (metadata as { maxExpectedToolCalls?: number })?.maxExpectedToolCalls;

    if (max === undefined) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No maxExpectedToolCalls in metadata; skipping budget check.',
      };
    }

    const withinBudget = actual <= max;
    return {
      score: withinBudget ? 1.0 : 0.0,
      label: withinBudget ? 'within-budget' : 'over-budget',
      explanation: `${actual} skill tool calls (max: ${max})${
        withinBudget ? '' : ` — ${actual - max} over budget`
      }`,
      metadata: { actual, max },
    };
  },
});

/**
 * Scores 1.0 if filestore.read was called (skill is loaded), 0.0 if absent.
 * Optionally validates that the loaded skill name contains the expected substring.
 */
export const createSkillLoadedEvaluator = (expectedSkillName?: string): Evaluator => ({
  name: 'SkillLoaded',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const allSteps = getRawToolCallSteps(output);
    const filestoreStep = allSteps.find((s) => s.tool_id === 'filestore.read');

    if (!filestoreStep) {
      return {
        score: 0.0,
        label: 'skill-not-loaded',
        explanation: 'filestore.read was never called — the agent has no skill loaded.',
      };
    }

    if (expectedSkillName) {
      const params = filestoreStep.params as Record<string, unknown> | undefined;
      const loadedName = String(params?.name ?? params?.path ?? '');
      if (!loadedName.includes(expectedSkillName)) {
        return {
          score: 0.0,
          label: 'wrong-skill',
          explanation: `Expected skill containing "${expectedSkillName}" but loaded "${loadedName}".`,
          metadata: { loadedName, expectedSkillName },
        };
      }
    }

    return {
      score: 1.0,
      label: 'skill-loaded',
      explanation: 'filestore.read called — skill is loaded.',
    };
  },
});

/**
 * Evaluates whether specific tool calls were made with expected parameters.
 * Each assertion targets a tool ID and checks that its params match the given predicate.
 */
export const createParameterAssertionEvaluator = (
  assertions: Array<{
    toolId: string;
    description: string;
    check: (params: Record<string, unknown>) => boolean;
  }>
): Evaluator => ({
  name: 'ParameterAssertion',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const steps = getSkillToolCallSteps(output);
    const results: Array<{
      toolId: string;
      description: string;
      passed: boolean;
      params?: unknown;
    }> = [];

    for (const assertion of assertions) {
      const matchingStep = steps.find((s) => s.tool_id === assertion.toolId);
      if (!matchingStep) {
        results.push({
          toolId: assertion.toolId,
          description: assertion.description,
          passed: false,
        });
        continue;
      }
      const params = (matchingStep.params ?? {}) as Record<string, unknown>;
      results.push({
        toolId: assertion.toolId,
        description: assertion.description,
        passed: assertion.check(params),
        params,
      });
    }

    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const score = total > 0 ? passed / total : 1.0;

    const failures = results.filter((r) => !r.passed);
    const explanation =
      failures.length === 0
        ? `All ${total} parameter assertions passed.`
        : failures
            .map((f) => `${f.toolId}: ${f.description} (params: ${truncate(f.params, 200)})`)
            .join('; ');

    return {
      score,
      label: score === 1.0 ? 'all-passed' : 'assertions-failed',
      explanation,
      metadata: { results },
    };
  },
});

/**
 * Trajectory evaluator configured for the streams management skill.
 * Platform tools (filestore.read) are filtered out before comparison.
 * Coverage weighted 0.6 (which tools were called matters most),
 * order weighted 0.4 (parallel tool calls are acceptable).
 */
export const createStreamsTrajectoryEvaluator = (): Evaluator =>
  createTrajectoryEvaluator({
    extractToolCalls: (output) => getSkillToolCallSteps(output).map((s) => s.tool_id ?? ''),
    goldenPathExtractor: (expected) => {
      const meta = expected as { expectedToolSequence?: string[] };
      return meta?.expectedToolSequence ?? [];
    },
    coverageWeight: 0.6,
    orderWeight: 0.4,
  });
