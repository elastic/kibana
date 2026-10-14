/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { buildSpaceFilter } from '@kbn/evals-common';
import type { EvalsRouteHandlerContext } from '../../types';

/** Upper bound on the spaces one trace's scores are shared with. */
const MAX_SCORE_SPACES = 100;

const SCORE_SPACES_AGGS = {
  space_ids: { terms: { field: 'space_ids', size: MAX_SCORE_SPACES } },
} as const;

/**
 * Decides which spaces' traces and logs a read of one trace id may cover.
 *
 * A trace is written to the space of the Kibana request that produced it, which is not
 * always the space its scores belong to: a CLI run scores into `--space-ids` while its
 * Kibana calls go to the default space, and a score can be shared with several spaces. So
 * when a score visible in `spaceId` references the trace, the read also covers the spaces
 * those scores belong to, plus the default space.
 *
 * Score ingestion only accepts spaces the caller can manage evals in, so a score can't
 * widen a read to a space its writer had no access to. The default space is the exception,
 * kept so CLI traces stay readable from the spaces their scores were written to.
 *
 * @returns the spaces to read from, always including `spaceId`.
 */
export const resolveTraceReadSpaces = async ({
  evalsContext: { evaluationScoreService, onlineScoreService },
  spaceId,
  traceId,
}: {
  evalsContext: Pick<EvalsRouteHandlerContext, 'evaluationScoreService' | 'onlineScoreService'>;
  spaceId: string;
  traceId: string;
}): Promise<string[]> => {
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
      aggs: SCORE_SPACES_AGGS,
    }),
    onlineScoreService.search({
      size: 0,
      track_total_hits: 1,
      query: {
        bool: { filter: [{ term: { trace_id: traceId } }, { term: { space_ids: spaceId } }] },
      },
      aggs: SCORE_SPACES_AGGS,
    }),
  ]);

  const isReferenced = countHits(scores.hits.total) > 0 || countHits(onlineScores.hits.total) > 0;
  if (!isReferenced) {
    return [spaceId];
  }

  return Array.from(
    new Set([
      spaceId,
      ...getScoreSpaceIds(scores.aggregations),
      ...getScoreSpaceIds(onlineScores.aggregations),
      DEFAULT_SPACE_ID,
    ])
  );
};

const countHits = (total: number | { value: number } | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

const getScoreSpaceIds = (
  aggregations: Record<string, AggregationsAggregate> | undefined
): string[] => {
  const spaceIdsAggregation = aggregations?.space_ids as
    | { buckets?: Array<{ key: string | number }> }
    | undefined;
  const buckets = Array.isArray(spaceIdsAggregation?.buckets) ? spaceIdsAggregation.buckets : [];
  return buckets.map(({ key }) => String(key));
};
