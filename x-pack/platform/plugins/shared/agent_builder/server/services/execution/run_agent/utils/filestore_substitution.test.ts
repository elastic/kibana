/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ToolResult } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  ConversationRoundStepType,
  createSubstitutionStep,
} from '@kbn/agent-builder-common';
import type { ToolResultStore } from '@kbn/agent-builder-server/runner';
import { timelineFromRounds } from '../../../../test_utils/timeline';
import {
  collectSubstitutionMarks,
  createMarkedResultTransformer,
  isSubstitutionCandidate,
  selectSubstitutionCandidates,
  substituteToolCallResults,
  SUBSTITUTION_MIN_RESULT_TOKENS,
  toolCallKey,
} from './filestore_substitution';

const logger = { warn: jest.fn(), debug: jest.fn() } as unknown as Logger;

const other = (id: string): ToolResult =>
  ({ type: ToolResultType.other, tool_result_id: id, data: { v: 'x' } } as ToolResult);

const store = (entries: Record<string, number>): ToolResultStore =>
  ({
    getEntryByResultId: jest.fn(async (id: string) =>
      id in entries
        ? { path: `/tool_x_call/${id}.json`, metadata: { token_count: entries[id] } }
        : undefined
    ),
  } as unknown as ToolResultStore);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isSubstitutionCandidate', () => {
  it('rejects file references and filestore-excluded tools', () => {
    expect(isSubstitutionCandidate({ toolId: 'platform.core.search', result: other('r') })).toBe(
      true
    );
    expect(
      isSubstitutionCandidate({
        toolId: 'platform.core.search',
        result: {
          type: ToolResultType.fileReference,
          tool_result_id: 'r',
          data: { filepath: '/f', comment: '' },
        } as ToolResult,
      })
    ).toBe(false);
    expect(isSubstitutionCandidate({ toolId: 'read_file', result: other('r') })).toBe(false);
  });
});

describe('collectSubstitutionMarks', () => {
  it('unions marks from timeline substitution steps and the current run substitution steps', () => {
    const timeline = timelineFromRounds([
      {
        id: 'a',
        steps: [
          {
            type: ConversationRoundStepType.substitution,
            substituted_tool_calls: [
              { round_id: 'a', tool_call_id: 'c1' },
              { round_id: 'a', tool_call_id: 'c2' },
            ],
            trigger: 'round_start',
            threshold_tokens: 1_000,
          },
        ],
      },
    ]);
    const steps = [
      createSubstitutionStep({
        substituted_tool_calls: [{ round_id: 'b', tool_call_id: 'c1' }],
        trigger: 'intra_round',
        threshold_tokens: 2_000,
      }),
    ];
    expect([...collectSubstitutionMarks({ timeline, steps })].sort()).toEqual([
      toolCallKey({ round_id: 'a', tool_call_id: 'c1' }),
      toolCallKey({ round_id: 'a', tool_call_id: 'c2' }),
      toolCallKey({ round_id: 'b', tool_call_id: 'c1' }),
    ]);
  });
});

describe('substituteToolCallResults', () => {
  it('replaces results with file references when the store has an entry, else keeps them raw', async () => {
    const results = await substituteToolCallResults({
      toolCall: {
        tool_call_id: 'c',
        tool_id: 't',
        params: {},
        results: [other('r1'), other('r2')],
      },
      resultStore: store({ r1: 5_000 }),
      logger,
    });
    expect(results[0]).toEqual(
      expect.objectContaining({ type: ToolResultType.fileReference, tool_result_id: 'r1' })
    );
    expect((results[0] as any).data.filepath).toContain('/r1.json');
    expect(results[1]).toEqual(other('r2'));
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('keeps results at or below the minimum size inline', async () => {
    const results = await substituteToolCallResults({
      toolCall: {
        tool_call_id: 'c',
        tool_id: 't',
        params: {},
        results: [other('big'), other('small')],
      },
      resultStore: store({ big: 5_000, small: SUBSTITUTION_MIN_RESULT_TOKENS }),
      logger,
    });
    expect(results.map(({ type }) => type)).toEqual([
      ToolResultType.fileReference,
      ToolResultType.other,
    ]);
  });

  it('keeps tool-specific summaries inline', async () => {
    const summary = {
      type: ToolResultType.other,
      tool_result_id: 'r1',
      data: { v: 'short', _summary: true },
    } as ToolResult;
    const results = await substituteToolCallResults({
      toolCall: { tool_call_id: 'c', tool_id: 't', params: {}, results: [summary] },
      resultStore: store({ r1: 5_000 }),
      logger,
    });
    expect(results).toEqual([summary]);
  });
});

describe('createMarkedResultTransformer', () => {
  it('applies the base transformer, then substitutes only tool calls marked in their round', async () => {
    const base = jest.fn(async (tc) => tc.results);
    const transform = createMarkedResultTransformer({
      marks: new Set([toolCallKey({ round_id: 'a', tool_call_id: 'marked' })]),
      resultStore: store({ r: 5_000 }),
      base,
      logger,
    });
    const marked = { tool_call_id: 'marked', tool_id: 't', params: {}, results: [other('r')] };
    const unmarked = { tool_call_id: 'other', tool_id: 't', params: {}, results: [other('r')] };

    expect((await transform('a')(marked))[0].type).toBe(ToolResultType.fileReference);
    expect((await transform('a')(unmarked))[0].type).toBe(ToolResultType.other);
    expect((await transform('b')(marked))[0].type).toBe(ToolResultType.other);
    expect(base).toHaveBeenCalledTimes(3);
  });

  it('returns the base output by reference when the tool call is not marked', async () => {
    const results = [other('r')];
    const base = jest.fn(async () => results);
    const transform = createMarkedResultTransformer({
      marks: new Set(),
      resultStore: store({}),
      base,
      logger,
    });
    expect(
      await transform('a')({ tool_call_id: 'x', tool_id: 't', params: {}, results: [other('z')] })
    ).toBe(results);
  });
});

describe('selectSubstitutionCandidates', () => {
  it('returns tool calls with any eligible result above the threshold, skipping marked ones', async () => {
    const toolCall = (id: string, resultId: string, toolId = 't') => ({
      roundId: 'a',
      toolCall: { tool_call_id: id, tool_id: toolId, params: {}, results: [other(resultId)] },
    });
    const selected = await selectSubstitutionCandidates({
      toolCalls: [
        toolCall('big', 'r1'),
        toolCall('small', 'r2'),
        toolCall('marked', 'r3'),
        toolCall('excluded', 'r4', 'read_file'),
        { ...toolCall('marked', 'r5'), roundId: 'b' },
      ],
      resultStore: store({ r1: 5000, r2: 10, r3: 5000, r4: 5000, r5: 5000 }),
      thresholdTokens: 1000,
      alreadyMarked: new Set([toolCallKey({ round_id: 'a', tool_call_id: 'marked' })]),
    });
    expect(selected).toEqual([
      { round_id: 'a', tool_call_id: 'big' },
      { round_id: 'b', tool_call_id: 'marked' },
    ]);
  });
});
