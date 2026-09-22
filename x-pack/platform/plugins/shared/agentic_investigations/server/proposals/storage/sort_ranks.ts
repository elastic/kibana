/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalConfidence, ProposalImpact } from '../../../common/proposals/proposal';

/**
 * Numeric mirrors of the keyword enums, written once at creation so
 * Elasticsearch can order the decision queue itself.
 *
 * The keywords sort alphabetically — `critical` before `high` before `low` —
 * which is not the order an analyst needs. Sorting in memory instead would cap
 * the queue at whatever we happened to fetch, so the rank travels with the
 * document.
 *
 * `category` has no rank: it is an arbitrary per-solution keyword used for
 * grouping and aggregation, and the order categories are displayed in is a UI
 * decision rather than a stored one.
 *
 * These are `Record<Enum, number>` on purpose: adding a value to an enum
 * without ranking it is a type error rather than a silent mis-sort.
 */
export const IMPACT_RANK: Record<ProposalImpact, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const CONFIDENCE_RANK: Record<ProposalConfidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** The sort fields derived from a proposal's snapshotted enums. */
export interface ProposalSortRanks {
  impactRank: number;
  confidenceRank: number;
}

export const toSortRanks = ({
  impact,
  confidence,
}: {
  impact: ProposalImpact;
  confidence: ProposalConfidence;
}): ProposalSortRanks => ({
  impactRank: IMPACT_RANK[impact],
  confidenceRank: CONFIDENCE_RANK[confidence],
});
