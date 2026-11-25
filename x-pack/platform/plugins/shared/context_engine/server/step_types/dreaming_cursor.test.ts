/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import {
  clampCursor,
  getGetDreamingCursorStepDefinition,
  getSetDreamingCursorStepDefinition,
} from './dreaming_cursor';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

const dependencies = ({
  service,
  dreamingAvailable = true,
  canWrite = true,
}: {
  service: Partial<AiIndexService>;
  dreamingAvailable?: boolean;
  canWrite?: boolean;
}) => ({
  getAiIndexService: () => service as AiIndexService,
  isDreamingAvailable: async () => dreamingAvailable,
  checkWritePrivilege: async () => canWrite,
  logger: mockKiStepTelemetry().logger,
});

describe('clampCursor', () => {
  const now = new Date('2026-06-30T00:00:00.000Z');

  it('keeps a cursor inside the window', () => {
    const cursor = { from: '2026-06-29T00:00:00.000Z', after: 'memory-9' };

    expect(clampCursor({ cursor, now, maxHours: 48 })).toEqual(cursor);
  });

  it('moves a cursor older than the window to its edge and drops its tie-breaker', () => {
    expect(
      clampCursor({
        cursor: { from: '2026-06-01T00:00:00.000Z', after: 'memory-9' },
        now,
        maxHours: 24,
      })
    ).toEqual({ from: '2026-06-29T00:00:00.000Z' });
  });

  it('keeps any cursor without a window', () => {
    const cursor = { from: '2020-01-01T00:00:00.000Z' };

    expect(clampCursor({ cursor, now })).toEqual(cursor);
  });
});

describe('getGetDreamingCursorStepDefinition', () => {
  const run = (service: Partial<AiIndexService>, options = {}, input = {}) =>
    getGetDreamingCursorStepDefinition(dependencies({ service, ...options })).handler(
      createMockStepContext({
        input: { ai_index_id: 'support', source: 'memories', ...input },
        esClient: {},
      })
    );

  it('reports that no cursor was saved yet', async () => {
    const getDreamingCursor = jest.fn().mockResolvedValue(undefined);

    await expect(run({ getDreamingCursor })).resolves.toEqual({ output: { found: false } });
    expect(getDreamingCursor).toHaveBeenCalledWith('support', 'default', 'memories');
  });

  it('returns the saved cursor', async () => {
    const getDreamingCursor = jest.fn().mockResolvedValue({
      from: new Date().toISOString(),
      after: 'memory-9',
      date_saved: new Date().toISOString(),
    });

    const { output } = await run({ getDreamingCursor }, {}, { source: 'traces' });

    expect(output).toEqual({ found: true, from: expect.any(String), after: 'memory-9' });
    expect(getDreamingCursor).toHaveBeenCalledWith('support', 'default', 'traces');
  });

  it('moves a cursor older than max_hours forward', async () => {
    const getDreamingCursor = jest.fn().mockResolvedValue({
      from: '2020-01-01T00:00:00.000Z',
      after: 'memory-9',
      date_saved: '2020-01-01T00:00:00.000Z',
    });

    const { output } = await run({ getDreamingCursor }, {}, { max_hours: 24 });

    expect(output).toEqual({ found: true, from: expect.not.stringMatching(/^2020/) });
    expect(output).not.toHaveProperty('after');
  });

  it('fails when the AI index does not exist', async () => {
    const getDreamingCursor = jest.fn().mockRejectedValue(new AiIndexNotFoundError('support'));

    const thrown = await run({ getDreamingCursor }).catch((error) => error);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.message).toContain("AI index 'support' not found");
  });

  it('fails while dreaming is unavailable, without reading', async () => {
    const getDreamingCursor = jest.fn();

    await expect(run({ getDreamingCursor }, { dreamingAvailable: false })).rejects.toBeInstanceOf(
      ExecutionError
    );
    expect(getDreamingCursor).not.toHaveBeenCalled();
  });
});

describe('getSetDreamingCursorStepDefinition', () => {
  const run = (service: Partial<AiIndexService>, options = {}, input = {}) =>
    getSetDreamingCursorStepDefinition(dependencies({ service, ...options })).handler(
      createMockStepContext({
        input: {
          ai_index_id: 'support',
          source: 'memories',
          from: '2026-06-29T10:00:00.000Z',
          after: 'memory-9',
          ...input,
        },
        esClient: {},
      })
    );

  it('saves the cursor of the source', async () => {
    const setDreamingCursor = jest.fn().mockResolvedValue(undefined);

    const { output } = await run({ setDreamingCursor });

    expect(setDreamingCursor).toHaveBeenCalledWith('support', 'default', 'memories', {
      from: '2026-06-29T10:00:00.000Z',
      after: 'memory-9',
    });
    expect(output).toEqual({ from: '2026-06-29T10:00:00.000Z', after: 'memory-9' });
  });

  it('omits an empty tie-breaker from the output', async () => {
    const setDreamingCursor = jest.fn().mockResolvedValue(undefined);

    const { output } = await run({ setDreamingCursor }, {}, { after: '' });

    expect(output).toEqual({ from: '2026-06-29T10:00:00.000Z' });
  });

  it('rejects a time it cannot parse, without saving', async () => {
    const setDreamingCursor = jest.fn();

    await expect(run({ setDreamingCursor }, {}, { from: 'yesterday' })).rejects.toBeInstanceOf(
      ExecutionError
    );
    expect(setDreamingCursor).not.toHaveBeenCalled();
  });

  it.each([
    ['dreaming is unavailable', { dreamingAvailable: false }],
    ['the user cannot write KIs', { canWrite: false }],
  ])('fails without saving while %s', async (_, options) => {
    const setDreamingCursor = jest.fn();

    await expect(run({ setDreamingCursor }, options)).rejects.toBeInstanceOf(ExecutionError);
    expect(setDreamingCursor).not.toHaveBeenCalled();
  });

  it('fails when the AI index does not exist', async () => {
    const setDreamingCursor = jest.fn().mockRejectedValue(new AiIndexNotFoundError('support'));

    await expect(run({ setDreamingCursor })).rejects.toBeInstanceOf(ExecutionError);
  });
});
