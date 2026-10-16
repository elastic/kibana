/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceFilter } from '@kbn/evals-common';
import type { EvalsRouteHandlerContext } from '../../types';

/**
 * Decides which spaces' traces and logs a read of one trace id may cover.
 *
 * A trace is written to the space of the Kibana request that produced it, which is not
 * always the space its scores belong to: a CLI run scores into `--space-ids` while its
 * Kibana calls go to the default space, and an experiment run in one space can assign its
 * scores to others. So when a score visible in `spaceId` references the trace, the read also
 * covers every other space the caller can read evals in.
 *
 * Score ingestion takes trace ids as given, so a score only marks the trace as part of what
 * `spaceId` shows. Access to the space a trace was written in still comes from the caller's
 * own privileges there.
 *
 * @returns the spaces to read from, always including `spaceId`.
 */
export const resolveTraceReadSpaces = async ({
  evalsContext: { evaluationScoreService, onlineScoreService },
  spaceId,
  traceId,
  getEvalsReadableSpaceIds,
}: {
  evalsContext: Pick<EvalsRouteHandlerContext, 'evaluationScoreService' | 'onlineScoreService'>;
  spaceId: string;
  traceId: string;
  /** Spaces the caller can read evals in. Without it, reads stay in `spaceId`. */
  getEvalsReadableSpaceIds?: () => Promise<string[]>;
}): Promise<string[]> => {
  if (!getEvalsReadableSpaceIds) {
    return [spaceId];
  }

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

  const isReferenced = countHits(scores.hits.total) > 0 || countHits(onlineScores.hits.total) > 0;
  if (!isReferenced) {
    return [spaceId];
  }

  return Array.from(new Set([spaceId, ...(await getEvalsReadableSpaceIds())]));
};

const countHits = (total: number | { value: number } | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;
