/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceFilter } from '@kbn/evals-common';
import type { EvalsRouteHandlerContext } from '../../types';

/**
 * Decides which space's traces a read of one trace id is limited to.
 *
 * A trace is written to the space of the Kibana request that produced it, which is not
 * always the space its scores belong to: a CLI run scores into `--space-ids` while its agent
 * calls go to the default space, and a score can be shared with several spaces. So a trace
 * that a score visible in `spaceId` points at is read wherever it was written. The score
 * is already filtered to the space, so holding its trace id is what grants the read.
 *
 * Every other trace is only readable from the space it was written in.
 *
 * @returns `undefined` to read the trace from any space, otherwise `spaceId`.
 */
export const resolveTraceReadSpace = async ({
  evalsContext: { evaluationScoreService, onlineScoreService },
  spaceId,
  traceId,
}: {
  evalsContext: Pick<EvalsRouteHandlerContext, 'evaluationScoreService' | 'onlineScoreService'>;
  spaceId: string;
  traceId: string;
}): Promise<string | undefined> => {
  const [scores, onlineScores] = await Promise.all([
    evaluationScoreService.search({
      size: 0,
      track_total_hits: 1,
      query: {
        bool: {
          filter: [buildSpaceFilter(spaceId)],
          should: [
            { term: { 'task.trace_id': traceId } },
            { term: { 'evaluator.trace_id': traceId } },
          ],
          minimum_should_match: 1,
        },
      },
    }),
    onlineScoreService.search({
      size: 0,
      track_total_hits: 1,
      query: {
        bool: { filter: [{ term: { trace_id: traceId } }, { term: { space_ids: spaceId } }] },
      },
    }),
  ]);

  return countHits(scores.hits.total) > 0 || countHits(onlineScores.hits.total) > 0
    ? undefined
    : spaceId;
};

const countHits = (total: number | { value: number } | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;
