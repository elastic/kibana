/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../dreaming/trace_rounds', () => ({
  ...jest.requireActual('../dreaming/trace_rounds'),
  readTraceTranscripts: jest.fn(),
  loadTraceTranscripts: jest.fn(),
}));

import { DEFAULT_TRACE_TRANSCRIPTS_READ_TOKENS } from '../../common/step_types/read_trace_transcripts';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { loadTraceTranscripts, readTraceTranscripts } from '../dreaming/trace_rounds';
import {
  getLoadTraceTranscriptsStepDefinition,
  getReadTraceTranscriptsStepDefinition,
} from './read_trace_transcripts';
import { createMockStepContext } from './test_utils';

const NOW = new Date('2026-11-11T13:20:00.000Z');
const traces = [{ type: 'elastic_agent', value: 'elastic-ai-agent', query: 'FROM traces' }];
const input = { ai_index_id: 'support', since: '2026-11-11T12:00:00.000Z' };
const read = {
  memories: [],
  found: [],
  resume_from: '2026-11-11T13:15:00.000Z',
  sources: [],
  skipped: 0,
};
const { memories: _memories, found: _found, ...readOutput } = read;

describe('readTraceTranscripts step', () => {
  let get: jest.Mock;
  let canRead: boolean;
  let memoryEnabled: boolean;
  const esClient = { search: jest.fn() };

  const run = (stepInput: Record<string, unknown> = input) =>
    getReadTraceTranscriptsStepDefinition(
      {
        getAiIndexService: () => ({ get } as unknown as AiIndexService),
        isContextEngineEnabled: async () => true,
        isMemoryEnabled: async () => memoryEnabled,
        checkReadPrivilege: async () => canRead,
      },
      { getCurrentDate: () => NOW }
    ).handler(createMockStepContext({ input: stepInput, esClient, spaceId: 'team-a' }));

  beforeEach(() => {
    jest.clearAllMocks();
    canRead = true;
    memoryEnabled = true;
    get = jest.fn().mockResolvedValue({ id: 'support', traces });
    jest.mocked(readTraceTranscripts).mockResolvedValue(read);
  });

  it("reads the AI index's trace sources as the workflow user, up to the settle time", async () => {
    await expect(run({ ...input, after: 'trace-1', size: 20 })).resolves.toEqual({
      output: { ...readOutput, rounds: 0, batches: [] },
    });
    expect(readTraceTranscripts).toHaveBeenCalledWith({
      esClient,
      traces,
      spaceId: 'team-a',
      since: input.since,
      after: 'trace-1',
      until: '2026-11-11T13:15:00.000Z',
      size: 20,
      maxTokens: DEFAULT_TRACE_TRANSCRIPTS_READ_TOKENS,
    });
  });

  it('returns the boundaries of the batches, not the transcripts', async () => {
    const round = (id: string, conversation: string) => ({
      id: `trace:${id}`,
      type: 'trace.round',
      title: '',
      content: 'x'.repeat(400),
      updated_at: '2026-11-11T13:00:00.000Z',
      attributes: { 'trace.conversation_id': conversation },
      permissions: { kibana: { privileges: [{ space: 'team-a' }] } },
    });
    const foundRound = (traceId: string) => ({
      traceId,
      lastAt: '2026-11-11T13:00:00.000Z',
      target: 'traces',
    });
    jest.mocked(readTraceTranscripts).mockResolvedValue({
      ...read,
      memories: [round('a1', 'a'), round('b1', 'b'), round('a2', 'a')],
      found: [foundRound('a1'), foundRound('b1'), foundRound('a2')],
    });

    const result = await run({ ...input, max_tokens: 5000, batch_tokens: 200 });

    expect(jest.mocked(readTraceTranscripts).mock.calls[0][0].maxTokens).toBe(5000);
    expect(result.output).toEqual({
      ...readOutput,
      rounds: 3,
      batches: [
        [
          { trace_id: 'a1', last_at: '2026-11-11T13:00:00.000Z', target: 'traces' },
          { trace_id: 'a2', last_at: '2026-11-11T13:00:00.000Z', target: 'traces' },
        ],
        [{ trace_id: 'b1', last_at: '2026-11-11T13:00:00.000Z', target: 'traces' }],
      ],
    });
    expect(result.output).not.toHaveProperty('memories');
  });

  it('keeps a read under 100 batches, continuing after the last round it kept', async () => {
    const lastAt = '2026-11-11T13:00:00.000Z';
    const total = 150;
    const memories = Array.from({ length: total }, (_, i) => ({
      id: `trace:t${i}`,
      type: 'trace.round',
      title: '',
      content: 'x'.repeat(400),
      updated_at: lastAt,
      attributes: { 'trace.conversation_id': `c${i}` },
      permissions: { kibana: { privileges: [{ space: 'team-a' }] } },
    }));
    jest.mocked(readTraceTranscripts).mockResolvedValue({
      ...read,
      memories,
      found: memories.map((_m, i) => ({ traceId: `t${i}`, lastAt: `${i}`, target: 'traces' })),
    });

    const result = await run({ ...input, size: 200, max_tokens: 10000, batch_tokens: 100 });

    expect(result.output?.batches).toHaveLength(100);
    expect(result.output?.rounds).toBe(100);
    expect(result.output?.resume_from).toBe('99');
    expect(result.output?.resume_after).toBe('t99');
  });

  it('rejects a budget that makes more than 100 batches', async () => {
    await expect(run({ ...input, max_tokens: 10_000_000, batch_tokens: 50_000 })).rejects.toThrow(
      'more than 100 batches'
    );
    expect(readTraceTranscripts).not.toHaveBeenCalled();
  });

  it('takes the settle time it is given, and reads from since without an after', async () => {
    await run({ ...input, after: '', settle_minutes: 0 });
    expect(readTraceTranscripts).toHaveBeenCalledWith(
      expect.not.objectContaining({ after: expect.anything() })
    );
    expect(jest.mocked(readTraceTranscripts).mock.calls[0][0].until).toBe(NOW.toISOString());
  });

  it('reads nothing, keeping the cursor, without trace sources or while memory or dreaming is off', async () => {
    get.mockResolvedValue({ id: 'support', traces: [] });
    const empty = {
      output: { rounds: 0, batches: [], resume_from: input.since, sources: [], skipped: 0 },
    };
    await expect(run()).resolves.toEqual(empty);
    get.mockResolvedValue({ id: 'support', traces });
    memoryEnabled = false;
    await expect(run()).resolves.toEqual(empty);
    expect(readTraceTranscripts).not.toHaveBeenCalled();
  });

  it('fails without the Context Engine read privilege, or for an AI index that is gone', async () => {
    canRead = false;
    await expect(run()).rejects.toThrow('Insufficient privileges to read AI indices');
    canRead = true;
    get.mockRejectedValue(new AiIndexNotFoundError('support'));
    await expect(run()).rejects.toThrow("AI index 'support' not found");
  });
});

describe('loadTraceTranscripts step', () => {
  const target = 'traces';
  const memory = (id: string, content: string) => ({
    id: `trace:${id}`,
    type: 'trace.round',
    title: 't',
    content,
    updated_at: '2026-11-11T13:00:00.000Z',
    permissions: { kibana: { privileges: [{ space: 'team-a' }] } },
  });
  const ref = (traceId: string, extra: Record<string, unknown> = {}) => ({
    trace_id: traceId,
    last_at: '2026-11-11T13:00:00.000Z',
    target,
    ...extra,
  });
  const esClient = { search: jest.fn() };
  const get = jest.fn();

  const run = (rounds: unknown[], extra: Record<string, unknown> = {}) =>
    getLoadTraceTranscriptsStepDefinition({
      getAiIndexService: () => ({ get } as unknown as AiIndexService),
      isContextEngineEnabled: async () => true,
      isMemoryEnabled: async () => true,
      checkReadPrivilege: async () => true,
    }).handler(
      createMockStepContext({
        input: { ai_index_id: 'support', rounds, ...extra },
        esClient,
        spaceId: 'team-a',
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({
      id: 'support',
      traces: [{ type: 'index', value: 'traces', query: 'FROM traces' }],
    });
  });

  it('loads the transcripts of the rounds of the batch as the workflow user', async () => {
    jest.mocked(loadTraceTranscripts).mockResolvedValue([memory('a', 'A'), memory('b', 'B')]);

    const result = await run([ref('b'), ref('a')]);

    expect(loadTraceTranscripts).toHaveBeenCalledWith({
      esClient,
      spaceId: 'team-a',
      rounds: [
        { traceId: 'b', lastAt: '2026-11-11T13:00:00.000Z', target },
        { traceId: 'a', lastAt: '2026-11-11T13:00:00.000Z', target },
      ],
    });
    expect(result.output?.memories.map(({ id }) => id)).toEqual(['trace:b', 'trace:a']);
  });

  it('keeps only the parts of a long round that the batch holds', async () => {
    jest.mocked(loadTraceTranscripts).mockResolvedValue([memory('big', 'line\n'.repeat(500))]);

    const first = await run([ref('big', { parts: { from: 0, to: 1 } })], { batch_tokens: 100 });
    const rest = await run([ref('big', { parts: { from: 1, to: 99 } })], { batch_tokens: 100 });

    expect(first.output?.memories).toHaveLength(1);
    expect(first.output?.memories[0].content).toMatch(/^\[Part 1 of /);
    expect(rest.output?.memories.length).toBeGreaterThan(1);
    expect(rest.output?.memories[0].content).toMatch(/^\[Part 2 of /);
  });

  it('refuses rounds that are not from a trace source of the AI index', async () => {
    await expect(run([ref('a', { target: 'secrets-*' })])).rejects.toThrow(
      "'secrets-*' is not a trace source"
    );
    expect(loadTraceTranscripts).not.toHaveBeenCalled();
  });
});
