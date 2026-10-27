/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import { loggerMock } from '@kbn/logging-mocks';
import type { LongTermMemoryType } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { applyDreamOperations } from './apply_operations';
import { fetchCandidates } from './candidates';
import { FACT_MEMORY_TYPE } from './fact_type';
import { findLinks } from './links';
import type { LongTermMemoryTypeDefinition } from './long_term_types';
import { RELATIONSHIP_MEMORY_TYPE } from './relationship_type';
import { readDreamWindow } from './read_window';
import type { RunDreamParams } from './run_dream';
import { FROM_THE_BEGINNING, RUN_TIME_BUDGET_MS, runDream } from './run_dream';

jest.mock('./read_window', () => ({ readDreamWindow: jest.fn() }));
jest.mock('./candidates', () => ({ fetchCandidates: jest.fn() }));
jest.mock('./apply_operations', () => ({ applyDreamOperations: jest.fn() }));
jest.mock('./links', () => ({ findLinks: jest.fn() }));

const readWindowMock = jest.mocked(readDreamWindow);
const fetchCandidatesMock = jest.mocked(fetchCandidates);
const findLinksMock = jest.mocked(findLinks);
const applyMock = jest.mocked(applyDreamOperations);

const RUN_START = new Date('2026-10-02T00:00:00.000Z');
const NOW = RUN_START.toISOString();

const OTHER_TYPE: LongTermMemoryTypeDefinition = {
  ...FACT_MEMORY_TYPE,
  type: 'memory.other' as unknown as LongTermMemoryType,
  label: 'others',
};

/** About 1,000 estimated tokens each, so 30 fit in a batch. */
const memory = (index: number): StoredMemoryDocument =>
  ({
    id: `s${index}`,
    type: 'memory.session_fact',
    '@timestamp': new Date(Date.UTC(2026, 9, 1, 0, 0, index)).toISOString(),
    title: `memory ${index}`,
    description: 'd'.repeat(1900),
    content: 'c'.repeat(1900),
  } as StoredMemoryDocument);

const memories = (count: number) => Array.from({ length: count }, (_, index) => memory(index));

describe('runDream', () => {
  let output: jest.Mock;

  const dream = (params: Partial<RunDreamParams> = {}) =>
    runDream({
      esClient: {} as ElasticsearchClient,
      inferenceClient: { output } as unknown as InferenceClient,
      connectorId: 'connector',
      spaceId: 'team-a',
      runStart: RUN_START,
      logger: loggerMock.create(),
      types: [FACT_MEMORY_TYPE],
      ...params,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    output = jest.fn().mockResolvedValue({ output: { operations: [] } });
    readWindowMock.mockResolvedValue({ memories: memories(3) });
    fetchCandidatesMock.mockResolvedValue([]);
    findLinksMock.mockResolvedValue([]);
    applyMock.mockResolvedValue({ applied: 1, skipped: 0 });
  });

  it('reads everything on the first dream and moves the cursor to the run start', async () => {
    const result = await dream();

    expect(readWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: FROM_THE_BEGINNING, to: NOW })
    );
    expect(output).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      types: {
        'memory.fact': {
          memoriesRead: 3,
          applied: 1,
          skipped: 0,
          batches: 1,
          cursor: NOW,
          caughtUp: true,
        },
      },
      caughtUp: true,
    });
  });

  it('only cites the memories of the current batch', async () => {
    readWindowMock.mockResolvedValue({ memories: memories(35) });

    await dream();

    expect(output).toHaveBeenCalledTimes(2);
    const [first, second] = applyMock.mock.calls.map(([{ sources }]) => [...sources.keys()]);
    expect(first).toHaveLength(30);
    expect(second).toEqual(['s30', 's31', 's32', 's33', 's34']);
  });

  it('keeps the progress of earlier batches when a batch fails', async () => {
    readWindowMock.mockResolvedValue({ memories: memories(35) });
    output
      .mockResolvedValueOnce({ output: { operations: [] } })
      .mockRejectedValueOnce(new Error('model unavailable'));

    const result = await dream();

    expect(result.types['memory.fact']).toMatchObject({
      batches: 1,
      memoriesRead: 30,
      cursor: memory(29)['@timestamp'],
      caughtUp: false,
      error: 'model unavailable',
    });
    expect(result).toMatchObject({ caughtUp: true });
    expect(result.behindFrom).toBeUndefined();
  });

  it('stops at a batch boundary once the time budget is spent', async () => {
    readWindowMock.mockResolvedValue({ memories: memories(35) });
    const getNow = jest
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(RUN_TIME_BUDGET_MS);

    const result = await dream({ getNow });

    expect(output).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      caughtUp: false,
      behindFrom: memory(29)['@timestamp'],
      types: { 'memory.fact': { batches: 1, caughtUp: false } },
    });
  });

  it('is behind when the window was cut short', async () => {
    readWindowMock.mockResolvedValue({
      memories: memories(3),
      truncatedAt: memory(2)['@timestamp'],
    });

    const result = await dream();

    expect(result).toMatchObject({
      caughtUp: false,
      behindFrom: memory(2)['@timestamp'],
      types: { 'memory.fact': { cursor: memory(2)['@timestamp'], caughtUp: false } },
    });
  });

  it('starts a type added to a task with history from now', async () => {
    const cursors = { 'memory.fact': memory(0)['@timestamp'] };

    const result = await dream({ cursors, types: [FACT_MEMORY_TYPE, OTHER_TYPE] });

    expect(readWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: memory(0)['@timestamp'] })
    );
    expect(result.types['memory.fact']).toMatchObject({ memoriesRead: 2, cursor: NOW });
    expect(result.types['memory.other']).toMatchObject({
      memoriesRead: 0,
      batches: 0,
      cursor: NOW,
    });
    expect(output).toHaveBeenCalledTimes(1);
  });

  it('keeps dreaming the other types when one fails', async () => {
    output.mockImplementation(async ({ id }: { id: string }) => {
      if (id.endsWith('memory.other')) {
        throw new Error('model unavailable');
      }
      return { output: { operations: [] } };
    });

    const result = await dream({ types: [FACT_MEMORY_TYPE, OTHER_TYPE] });

    expect(result.types['memory.fact']).toMatchObject({ batches: 1, caughtUp: true });
    expect(result.types['memory.other']).toMatchObject({
      batches: 0,
      cursor: FROM_THE_BEGINNING,
      error: 'model unavailable',
    });
    expect(result.caughtUp).toBe(true);
  });

  it('dreams a linking type after the types it links, and only as far as they got', async () => {
    readWindowMock.mockResolvedValue({ memories: memories(35) });
    let factCalls = 0;
    output.mockImplementation(async ({ id }: { id: string }) => {
      if (id.endsWith('memory.fact') && ++factCalls === 2) {
        throw new Error('model unavailable');
      }
      return { output: { operations: [] } };
    });

    const result = await dream({ types: [RELATIONSHIP_MEMORY_TYPE, FACT_MEMORY_TYPE] });

    expect(output.mock.calls.map(([{ id }]) => id)).toEqual([
      'context_engine_memory_dream_memory.fact',
      'context_engine_memory_dream_memory.fact',
      'context_engine_memory_dream_memory.relationship',
    ]);
    expect(result.types['memory.relationship']).toMatchObject({
      memoriesRead: 30,
      batches: 1,
      cursor: memory(29)['@timestamp'],
      caughtUp: true,
    });
    expect(result.caughtUp).toBe(true);
  });

  it('is behind when a type it links is behind', async () => {
    readWindowMock.mockResolvedValue({ memories: memories(35) });
    const getNow = jest
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(RUN_TIME_BUDGET_MS);

    const result = await dream({ types: [FACT_MEMORY_TYPE, RELATIONSHIP_MEMORY_TYPE], getNow });

    expect(result.types['memory.relationship']).toMatchObject({ batches: 0, caughtUp: false });
    expect(result).toMatchObject({ caughtUp: false, behindFrom: FROM_THE_BEGINNING });
  });

  it('shows a linking type the memories it may link and their existing links', async () => {
    const entity = {
      id: 'entity-1',
      type: 'memory.entity',
      title: 'Search team',
      content: 'Owns search.',
      updated_at: NOW,
      attributes: { 'entity.kind': 'team' },
    } as unknown as StoredMemoryDocument;
    const link = {
      id: 'link-1',
      type: 'memory.relationship',
      title: 'Search team owns Context Engine',
      content: '',
      updated_at: NOW,
    } as StoredMemoryDocument;
    fetchCandidatesMock.mockResolvedValue([entity]);
    findLinksMock.mockResolvedValue([{ id: 'link-1', document: link, seqNo: 1, primaryTerm: 1 }]);

    await dream({ types: [RELATIONSHIP_MEMORY_TYPE] });

    expect(fetchCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({ types: RELATIONSHIP_MEMORY_TYPE.endpointTypes })
    );
    expect(findLinksMock).toHaveBeenCalledWith(expect.objectContaining({ ids: ['entity-1'] }));
    const { input } = output.mock.calls[0][0];
    expect(input).toContain('# Existing long-term memories\n- id: entity-1');
    expect(input).toContain('  kind: team');
    expect(input).toContain('# Existing long-term relationships\n- id: link-1');
  });
});
