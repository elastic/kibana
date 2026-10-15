/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceFilter } from '@kbn/evals-common';
import { resolveTraceReadSpaces } from './resolve_trace_read_spaces';

const searchResponse = (total: number | { value: number }) => ({ hits: { total, hits: [] } });

describe('resolveTraceReadSpaces', () => {
  const setup = ({
    scores = 0,
    onlineScores = 0,
    readableSpaceIds = ['sales'],
  }: {
    scores?: number | { value: number };
    onlineScores?: number;
    readableSpaceIds?: string[];
  } = {}) => {
    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue(searchResponse(scores)),
    };
    const onlineScoreService = {
      search: jest.fn().mockResolvedValue(searchResponse({ value: onlineScores })),
    };
    const getEvalsReadableSpaceIds = jest.fn().mockResolvedValue(readableSpaceIds);
    const evalsContext = { evaluationScoreService, onlineScoreService } as any;
    const resolve = (spaceId = 'sales') =>
      resolveTraceReadSpaces({
        evalsContext,
        spaceId,
        traceId: 'trace-1',
        getEvalsReadableSpaceIds,
      });
    return { resolve, evaluationScoreService, onlineScoreService, getEvalsReadableSpaceIds };
  };

  it('limits the read to the space when no score references the trace', async () => {
    const { resolve, getEvalsReadableSpaceIds } = setup({
      readableSpaceIds: ['sales', 'marketing'],
    });

    await expect(resolve()).resolves.toEqual(['sales']);
    expect(getEvalsReadableSpaceIds).not.toHaveBeenCalled();
  });

  it('reads the trace from the space an experiment ran in, even when its scores went elsewhere', async () => {
    // An experiment run in `marketing` that assigned its scores only to `sales`.
    const { resolve } = setup({ scores: { value: 1 }, readableSpaceIds: ['sales', 'marketing'] });

    await expect(resolve()).resolves.toEqual(['sales', 'marketing']);
  });

  it('does not reach a space the caller cannot read evals in, whatever the score references', async () => {
    // A score written in `sales` that points at a default-space trace the caller has no access to.
    const { resolve } = setup({ scores: { value: 1 }, readableSpaceIds: ['sales'] });

    const spaces = await resolve();

    expect(spaces).toEqual(['sales']);
    expect(spaces).not.toContain('default');
  });

  it('reads CLI traces from the default space for callers who can read evals there', async () => {
    const { resolve } = setup({ scores: { value: 1 }, readableSpaceIds: ['default', 'sales'] });

    await expect(resolve()).resolves.toEqual(['sales', 'default']);
  });

  it('widens the read for online scores the same way', async () => {
    const { resolve } = setup({ onlineScores: 1, readableSpaceIds: ['sales', 'marketing'] });

    await expect(resolve()).resolves.toEqual(['sales', 'marketing']);
  });

  it('accepts a numeric hit total', async () => {
    const { resolve } = setup({ scores: 2, readableSpaceIds: ['sales', 'marketing'] });

    await expect(resolve()).resolves.toEqual(['sales', 'marketing']);
  });

  it('stays in the space when it cannot tell which spaces the caller can read', async () => {
    const evalsContext = {
      evaluationScoreService: { search: jest.fn().mockResolvedValue(searchResponse(1)) },
      onlineScoreService: { search: jest.fn().mockResolvedValue(searchResponse(0)) },
    } as any;

    await expect(
      resolveTraceReadSpaces({ evalsContext, spaceId: 'sales', traceId: 'trace-1' })
    ).resolves.toEqual(['sales']);
    expect(evalsContext.evaluationScoreService.search).not.toHaveBeenCalled();
  });

  it('only counts scores visible in the requesting space', async () => {
    const { resolve, evaluationScoreService, onlineScoreService } = setup();

    await resolve();

    expect(evaluationScoreService.search).toHaveBeenCalledWith({
      size: 0,
      track_total_hits: 1,
      query: {
        bool: {
          filter: [buildSpaceFilter('sales')],
          should: [
            { term: { 'task.trace_id': 'trace-1' } },
            { term: { 'evaluator.trace_id': 'trace-1' } },
          ],
          minimum_should_match: 1,
        },
      },
    });
    expect(onlineScoreService.search).toHaveBeenCalledWith({
      size: 0,
      track_total_hits: 1,
      query: {
        bool: {
          filter: [{ term: { trace_id: 'trace-1' } }, { term: { space_ids: 'sales' } }],
        },
      },
    });
  });
});
