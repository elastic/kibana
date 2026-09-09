/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ProposalCategory,
  ProposalConfidence,
  ProposalImpact,
} from '../../../common/proposals/proposal';

/**
 * Numeric mirrors of the keyword enums, written once at creation so
 * Elasticsearch can order the decision queue itself.
 *
 * The keywords sort alphabetically — `critical` before `high` before `low` —
 * which is not the order an analyst needs. Sorting in memory instead would cap
 * the queue at whatever we happened to fetch, so the rank travels with the
 * document.
 *
 * These are `Record<Enum, number>` on purpose: adding a value to an enum
 * without ranking it is a type error rather than a silent mis-sort.
 */
export const CATEGORY_RANK: Record<ProposalCategory, number> = {
  contain: 0,
  escalate: 1,
  investigate: 2,
  tune: 3,
};

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

/**
 * `category` is stored as a plain string so a solution can extend the
 * vocabulary without a mapping change. Anything outside the shared baseline
 * sorts last rather than accidentally sorting first. Kept inside a `byte`.
 */
export const UNRANKED = 99;

const rankOf = <TKey extends string>(table: Record<TKey, number>, value: string): number =>
  value in table ? table[value as TKey] : UNRANKED;

/** The sort fields derived from a proposal's snapshotted enums. */
export interface ProposalSortRanks {
  categoryRank: number;
  impactRank: number;
  confidenceRank: number;
}

export const toSortRanks = ({
  category,
  impact,
  confidence,
}: {
  category: string;
  impact: ProposalImpact;
  confidence: ProposalConfidence;
}): ProposalSortRanks => ({
  categoryRank: rankOf(CATEGORY_RANK, category),
  impactRank: IMPACT_RANK[impact],
  confidenceRank: CONFIDENCE_RANK[confidence],
});
