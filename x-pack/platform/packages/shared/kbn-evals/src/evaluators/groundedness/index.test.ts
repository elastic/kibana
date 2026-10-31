/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createGroundednessAnalysisEvaluator,
  createQuantitativeGroundednessEvaluator,
  UNAVAILABLE_LABEL,
} from '.';
import { DEFAULT_TRANSCRIPT_BYTE_BUDGET } from './bound_transcript';

function createMockLog(): jest.Mocked<ToolingLog> {
  return {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<ToolingLog>;
}

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

/** The error `POST /internal/inference/prompt` raises for an over-cap body. */
const payloadTooLarge = () =>
  Object.assign(new Error('Payload content length greater than maximum allowed: 1679958'), {
    statusCode: 413,
    error: 'Request Entity Too Large',
  });

const analysis = {
  summary_verdict: 'GROUNDED' as const,
  analysis: [
    {
      claim: 'Entity analytics is enabled.',
      centrality: 'central' as const,
      centrality_reason: 'answers the question',
      verdict: 'FULLY_SUPPORTED' as const,
      evidence: { tool_call_id: 'c1', tool_id: 'security.get_entity', evidence_snippet: 'enabled' },
      explanation: 'supported by the tool result',
    },
  ],
};

const createInferenceClient = (
  implementation: () => Promise<{ toolCalls: Array<{ function: { arguments: unknown } }> }>
): { client: BoundInferenceClient; prompt: jest.Mock } => {
  const prompt = jest.fn().mockImplementation(implementation);
  return { client: { prompt, bindTo: jest.fn() } as unknown as BoundInferenceClient, prompt };
};

const hugeTranscript = () => [
  {
    type: 'tool_call',
    tool_id: 'security.search',
    params: { index: 'logs-*' },
    results: [{ type: 'text', data: { content: 'A'.repeat(3_000_000) } }],
  },
];

describe('createGroundednessAnalysisEvaluator', () => {
  it('bounds an over-cap transcript and records the cell as unavailable instead of throwing on 413', async () => {
    const log = createMockLog();
    const { client, prompt } = createInferenceClient(async () => {
      throw payloadTooLarge();
    });
    const evaluator = createGroundednessAnalysisEvaluator({ inferenceClient: client, log });

    const result = await evaluator.evaluate({
      input: { question: 'Is entity analytics enabled?' },
      output: { messages: [{ message: 'Yes.' }], steps: hugeTranscript() },
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe(UNAVAILABLE_LABEL);
    expect(result.explanation).toMatch(/HTTP 413/);

    // The judge request was composed from a bounded transcript, not the raw 3MB result.
    const composedHistory = prompt.mock.calls[0][0].input.tool_call_history as string;
    expect(byteLength(composedHistory)).toBeLessThanOrEqual(DEFAULT_TRANSCRIPT_BYTE_BUDGET);
    expect(JSON.parse(composedHistory)[0].tool_id).toBe('security.search');

    // A 413 is deterministic: fail fast rather than retrying the same oversized body.
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalled();
  });

  it('retries a malformed judge response and scores when a later attempt succeeds', async () => {
    const log = createMockLog();
    let calls = 0;
    const { client } = createInferenceClient(async () => {
      calls++;
      if (calls < 3) {
        return { toolCalls: [] };
      }
      return { toolCalls: [{ function: { arguments: analysis } }] };
    });
    const evaluator = createGroundednessAnalysisEvaluator({ inferenceClient: client, log });

    const result = await evaluator.evaluate({
      input: { question: 'Is entity analytics enabled?' },
      output: { messages: [{ message: 'Yes.' }], steps: [] },
      expected: undefined,
      metadata: null,
    });

    expect(calls).toBe(3);
    expect(result.label).toBe('groundedness-analysis');
    expect(result.metadata).toMatchObject({ summary_verdict: 'GROUNDED' });
  });

  it('records the cell as unavailable when every attempt returns no tool call', async () => {
    const log = createMockLog();
    const { client, prompt } = createInferenceClient(async () => ({ toolCalls: [] }));
    const evaluator = createGroundednessAnalysisEvaluator({ inferenceClient: client, log });

    const result = await evaluator.evaluate({
      input: { question: 'Is entity analytics enabled?' },
      output: { messages: [{ message: 'Yes.' }], steps: [] },
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe(UNAVAILABLE_LABEL);
    expect(prompt).toHaveBeenCalledTimes(4);
  });

  it('retries a transient 500 and records unavailable after exhausting attempts', async () => {
    const log = createMockLog();
    const { client, prompt } = createInferenceClient(async () => {
      throw Object.assign(new Error('boom'), { statusCode: 500 });
    });
    const evaluator = createGroundednessAnalysisEvaluator({ inferenceClient: client, log });

    const result = await evaluator.evaluate({
      input: { question: 'Is entity analytics enabled?' },
      output: { messages: [{ message: 'Yes.' }], steps: [] },
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe(UNAVAILABLE_LABEL);
    expect(prompt).toHaveBeenCalledTimes(4);
  });
});

describe('createQuantitativeGroundednessEvaluator', () => {
  it('scores a real analysis', async () => {
    const evaluator = createQuantitativeGroundednessEvaluator();

    const result = await evaluator.evaluate({
      input: undefined,
      output: { groundednessAnalysis: analysis },
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('GROUNDED');
  });

  it('records unavailable rather than fabricating a 0.0 from a judge-failure marker', async () => {
    const evaluator = createQuantitativeGroundednessEvaluator();

    const result = await evaluator.evaluate({
      input: undefined,
      output: {
        groundednessAnalysis: {
          judgeAttempts: 1,
          judgeFailures: ['HTTP 413: Payload content length greater than maximum allowed: 1679958'],
        },
      },
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe(UNAVAILABLE_LABEL);
  });
});
