/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceFilter } from '@kbn/evals-common';
import { resolveTraceReadSpace } from './resolve_trace_read_space';

describe('resolveTraceReadSpace', () => {
  const setup = ({ scores = 0, onlineScores = 0 }: { scores?: number; onlineScores?: number }) => {
    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue({ hits: { total: { value: scores }, hits: [] } }),
    };
    const onlineScoreService = {
      search: jest.fn().mockResolvedValue({ hits: { total: { value: onlineScores }, hits: [] } }),
    };
    const evalsContext = { evaluationScoreService, onlineScoreService } as any;
    return { evalsContext, evaluationScoreService, onlineScoreService };
  };

  it('limits the read to the space when no score references the trace', async () => {
    const { evalsContext } = setup({});

    await expect(
      resolveTraceReadSpace({ evalsContext, spaceId: 'marketing', traceId: 'trace-1' })
    ).resolves.toBe('marketing');
  });

  it('reads from any space when a score visible in the space references the trace', async () => {
    const { evalsContext } = setup({ scores: 1 });

    await expect(
      resolveTraceReadSpace({ evalsContext, spaceId: 'marketing', traceId: 'trace-1' })
    ).resolves.toBeUndefined();
  });

  it('reads from any space when an online score in the space references the trace', async () => {
    const { evalsContext } = setup({ onlineScores: 3 });

    await expect(
      resolveTraceReadSpace({ evalsContext, spaceId: 'marketing', traceId: 'trace-1' })
    ).resolves.toBeUndefined();
  });

  it('accepts a numeric hit total', async () => {
    const { evalsContext, evaluationScoreService } = setup({});
    evaluationScoreService.search.mockResolvedValue({ hits: { total: 2, hits: [] } });

    await expect(
      resolveTraceReadSpace({ evalsContext, spaceId: 'marketing', traceId: 'trace-1' })
    ).resolves.toBeUndefined();
  });

  it('only counts scores visible in the requesting space', async () => {
    const { evalsContext, evaluationScoreService, onlineScoreService } = setup({});

    await resolveTraceReadSpace({ evalsContext, spaceId: 'marketing', traceId: 'trace-1' });

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
    });
    expect(onlineScoreService.search).toHaveBeenCalledWith({
      size: 0,
      track_total_hits: 1,
      query: {
        bool: {
          filter: [{ term: { trace_id: 'trace-1' } }, { term: { space_ids: 'marketing' } }],
        },
      },
    });
  });
});
