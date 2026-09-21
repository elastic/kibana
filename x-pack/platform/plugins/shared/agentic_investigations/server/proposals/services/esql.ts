/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstExpression } from '@elastic/esql';
import { esql, exp } from '@elastic/esql';
import { PROPOSAL_UNCATEGORIZED } from '../../../common/proposals/constants';

/**
 * Elasticsearch's `esql.query.result_truncation_max_size` default. A LIMIT above
 * this is capped rather than honoured, so asking for more only hides the drop.
 */
export const ESQL_RESULT_TRUNCATION_MAX_SIZE = 10000;

export const ESQL_CATEGORY_ROW_LIMIT = 1000;

export interface ChartsWindow {
  spaceId: string;
  windowStartIso: string;
  bucketMinutes: number;
}

/** A superseded proposal is represented by its replacement; counting both double-counts a retry. */
const NOT_SUPERSEDED: ESQLAstExpression = exp`supersededBy IS NULL`;

export type EventStream = 'opens' | 'closes' | 'expiries';

/**
 * The streams that move the running sum, differing only in the timestamp they
 * bucket on and how they qualify it. `expiries` excludes anything decided so a
 * proposal that expired and was later decided is decremented once, by `closes`.
 */
const EVENT_STREAMS: Record<EventStream, { field: string; where: ESQLAstExpression }> = {
  opens: { field: 'createdAt', where: NOT_SUPERSEDED },
  closes: { field: 'decidedAt', where: exp`${NOT_SUPERSEDED} AND decidedAt IS NOT NULL` },
  expiries: {
    field: 'expiresAt',
    where: exp`${NOT_SUPERSEDED} AND decidedAt IS NULL AND expiresAt IS NOT NULL AND expiresAt <= NOW()`,
  },
};

/**
 * Counts one event stream per (bucket, category). `COALESCE(category, …)`
 * because a proposal with no action has no category: a bare `BY category` would
 * drop it, and under `drop_null_columns` would drop the column outright when no
 * row has one, zeroing the whole chart.
 */
export const bucketedEventQuery = (
  stream: EventStream,
  { spaceId, windowStartIso, bucketMinutes }: ChartsWindow
) => {
  const { field, where } = EVENT_STREAMS[stream];
  return esql`WHERE spaceId == ${{ spaceId }}
      AND ${where}
      AND ${[field]} >= TO_DATETIME(${{ from: windowStartIso }})
    | EVAL idx = FLOOR(DATE_DIFF("minutes", TO_DATETIME(${{ origin: windowStartIso }}), ${[
    field,
  ]}) / ${{ bucketMinutes }})
    | EVAL category = COALESCE(category, ${{ uncategorized: PROPOSAL_UNCATEGORIZED }})
    | STATS ${[stream]} = COUNT(*) BY idx, category
    | SORT idx ASC
    | LIMIT ${ESQL_RESULT_TRUNCATION_MAX_SIZE}`;
};

/** Seeds the running sum: open at the window start, so no event stream covers it. */
export const anchorQuery = ({ spaceId, windowStartIso }: ChartsWindow) =>
  esql`WHERE spaceId == ${{ spaceId }}
      AND ${NOT_SUPERSEDED}
      AND createdAt < TO_DATETIME(${{ created: windowStartIso }})
      AND (decidedAt IS NULL OR decidedAt >= TO_DATETIME(${{ decided: windowStartIso }}))
      AND (expiresAt IS NULL OR expiresAt >= TO_DATETIME(${{ expires: windowStartIso }}))
    | EVAL category = COALESCE(category, ${{ uncategorized: PROPOSAL_UNCATEGORIZED }})
    | STATS anchor = COUNT(*) BY category
    | LIMIT ${ESQL_CATEGORY_ROW_LIMIT}`;

/**
 * `expiresAt > NOW()` is a request-time predicate, which the bucketed queries
 * must never use: filtering there would erase a since-expired proposal from its
 * own past, so the same historical bucket would answer differently on every
 * refetch. This query has no history, so it is the one place that is correct.
 */
export const currentOpenQuery = ({ spaceId }: ChartsWindow) =>
  esql`WHERE spaceId == ${{ spaceId }}
      AND ${NOT_SUPERSEDED}
      AND decidedAt IS NULL
      AND (expiresAt IS NULL OR expiresAt > NOW())
    | STATS currentOpen = COUNT(*)`;
