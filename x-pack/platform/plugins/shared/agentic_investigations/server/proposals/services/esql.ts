/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstExpression } from '@elastic/esql';
import { esql, exp } from '@elastic/esql';
import { PROPOSAL_UNCATEGORIZED } from '../../../common/proposals/constants';
import type { ProposalStatus } from '../../../common/proposals/proposal';

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

/** Open is exactly `pending`: every other status is a settled proposal. */
const PENDING: ProposalStatus = 'pending';

/** A superseded proposal is represented by its replacement; counting both double-counts a retry. */
const NOT_SUPERSEDED: ESQLAstExpression = exp`supersededBy IS NULL`;

/**
 * When a proposal stopped being open. A decision sets `decidedAt`; a deadline
 * nobody answered leaves it null and settles the status to `expired`, where
 * `expiresAt` is the moment. Non-null for anything not `pending`.
 */
const CLOSED_AT: ESQLAstExpression = exp`COALESCE(decidedAt, expiresAt)`;

export type EventStream = 'opens' | 'closes';

/**
 * The streams that move the running sum. Every proposal was open when created,
 * so `opens` needs no status filter; `closes` takes decisions and expiries
 * together, because both are just a status leaving `pending`.
 */
const EVENT_STREAMS: Record<EventStream, { at: ESQLAstExpression; where: ESQLAstExpression }> = {
  opens: { at: exp`createdAt`, where: NOT_SUPERSEDED },
  closes: {
    at: CLOSED_AT,
    where: exp`${NOT_SUPERSEDED} AND status != ${PENDING}`,
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
  const { at, where } = EVENT_STREAMS[stream];
  return esql`WHERE spaceId == ${{ spaceId }}
      AND ${where}
      AND ${at} >= TO_DATETIME(${{ from: windowStartIso }})
    | EVAL idx = FLOOR(DATE_DIFF("minutes", TO_DATETIME(${{
      origin: windowStartIso,
    }}), ${at}) / ${{ bucketMinutes }})
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
      AND (status == ${PENDING} OR ${CLOSED_AT} >= TO_DATETIME(${{ closed: windowStartIso }}))
    | EVAL category = COALESCE(category, ${{ uncategorized: PROPOSAL_UNCATEGORIZED }})
    | STATS anchor = COUNT(*) BY category
    | LIMIT ${ESQL_CATEGORY_ROW_LIMIT}`;

/** Open right now, across every category. */
export const currentOpenQuery = ({ spaceId }: ChartsWindow) =>
  esql`WHERE spaceId == ${{ spaceId }}
      AND ${NOT_SUPERSEDED}
      AND status == ${PENDING}
    | STATS currentOpen = COUNT(*)`;
