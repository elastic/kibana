/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceFilter } from '@kbn/evals-common';
import { resolveTraceReadSpaces } from './resolve_trace_read_spaces';

const searchResponse = ({
  total,
  spaceIds = [],
}: {
  total: number | { value: number };
  spaceIds?: string[];
}) => ({
  hits: { total, hits: [] },
  aggregations: {
    space_ids: { buckets: spaceIds.map((key) => ({ key, doc_count: 1 })) },
  },
});

describe('resolveTraceReadSpaces', () => {
  const setup = ({
    scores = searchResponse({ total: { value: 0 } }),
    onlineScores = searchResponse({ total: { value: 0 } }),
  }: {
    scores?: ReturnType<typeof searchResponse>;
    onlineScores?: ReturnType<typeof searchResponse>;
  } = {}) => {
    const evaluationScoreService = { search: jest.fn().mockResolvedValue(scores) };
    const onlineScoreService = { search: jest.fn().mockResolvedValue(onlineScores) };
    const evalsContext = { evaluationScoreService, onlineScoreService } as any;
    return { evalsContext, evaluationScoreService, onlineScoreService };
  };

  const resolve = (evalsContext: unknown, spaceId = 'marketing') =>
    resolveTraceReadSpaces({ evalsContext: evalsContext as any, spaceId, traceId: 'trace-1' });

  it('limits the read to the space when no score references the trace', async () => {
    const { evalsContext } = setup();

    await expect(resolve(evalsContext)).resolves.toEqual(['marketing']);
  });

  it('widens the read to the spaces of the referencing scores, plus the default space', async () => {
    const { evalsContext } = setup({
      scores: searchResponse({ total: { value: 2 }, spaceIds: ['marketing', 'sales'] }),
    });

    await expect(resolve(evalsContext)).resolves.toEqual(['marketing', 'sales', 'default']);
  });

  it('widens the read for online scores the same way', async () => {
    const { evalsContext } = setup({
      onlineScores: searchResponse({ total: { value: 1 }, spaceIds: ['marketing'] }),
    });

    await expect(resolve(evalsContext)).resolves.toEqual(['marketing', 'default']);
  });

  it('never widens beyond the scores spaces, so a score cannot unlock an unrelated space', async () => {
    // A score written in `marketing` that points at a trace from `finance`.
    const { evalsContext } = setup({
      scores: searchResponse({ total: { value: 1 }, spaceIds: ['marketing'] }),
    });

    const spaces = await resolve(evalsContext);

    expect(spaces).not.toContain('finance');
  });

  it('reads the default space traces of legacy scores that have no space ids', async () => {
    const { evalsContext } = setup({ scores: searchResponse({ total: 1 }) });

    await expect(resolve(evalsContext, 'default')).resolves.toEqual(['default']);
  });

  it('only counts scores visible in the requesting space and collects their spaces', async () => {
    const { evalsContext, evaluationScoreService, onlineScoreService } = setup();

    await resolve(evalsContext);

    const aggs = { space_ids: { terms: { field: 'space_ids', size: 100 } } };
    expect(evaluationScoreService.search).toHaveBeenCalledWith({
      size: 0,
      track_total_hits: 1,
      query: {
        bool: {
          filter: [buildSpaceFilter('marketing')],
          should: [
            { term: { 'task.trace_id': 'trace-1' } },
            { term: { 'evaluator.trace_id': 'trace-1' } },
          ],
          minimum_should_match: 1,
        },
      },
      aggs,
    });
    expect(onlineScoreService.search).toHaveBeenCalledWith({
      size: 0,
      track_total_hits: 1,
      query: {
        bool: {
          filter: [{ term: { trace_id: 'trace-1' } }, { term: { space_ids: 'marketing' } }],
        },
      },
      aggs,
    });
  });
});
