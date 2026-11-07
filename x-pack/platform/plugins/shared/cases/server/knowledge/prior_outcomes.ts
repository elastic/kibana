/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES_OUTCOMES_AI_INDEX_ID,
  CASE_OUTCOME_KI_TYPE,
  MAX_PRIOR_OUTCOMES,
  PRIOR_OUTCOMES_DAYS,
  getCaseOutcomeKiId,
} from '../../common/constants';
import type { PriorOutcome, PriorOutcomesResponse } from '../../common/knowledge/types';
import type { CasesClient } from '../client';
import {
  collectCaseOutcomeInputs,
  getMatchKeysFromCase,
  getOutcomeMatchTags,
  getOutcomeScopeTags,
} from './case_outcome';

// Read a little past the list so the close-reason split covers more than what is shown.
const QUERY_LIMIT = 100;
export interface PriorOutcomesQuery {
  (params: { query: string; params: Record<string, string>; limit: number }): Promise<{
    columns: Array<{ name: string }>;
    values: unknown[][];
  }>;
}

// The context engine allows 100 query parameters: `self`, the space and owner tags, and the rest
// for match keys.
const MAX_MATCH_TAGS = 90;

/** Keeps the most telling keys first: rules, then hosts and users, then observables. */
export const capMatchTags = (matchTags: string[]) => matchTags.slice(0, MAX_MATCH_TAGS);

/**
 * Outcomes in the same space and owner that share any match key. The context engine adds its
 * lifecycle filter (ending in a DROP) after FROM, and ES|QL refuses KQL() after a DROP, so tags
 * are matched with MV_CONTAINS, one parameter each. The tags field is a lowercase-normalized
 * keyword, so the values are lowercased to match.
 */
export const buildPriorOutcomesQuery = (
  selfKiId: string,
  scopeTags: string[],
  matchTags: string[]
): { query: string; params: Record<string, string> } => {
  const params: Record<string, string> = { self: selfKiId };
  const scope = scopeTags.map((tag, i) => {
    params[`s${i}`] = tag.toLowerCase();
    return `MV_CONTAINS(tags, ?s${i})`;
  });
  const match = matchTags.map((tag, i) => {
    params[`m${i}`] = tag.toLowerCase();
    return `MV_CONTAINS(tags, ?m${i})`;
  });
  return {
    query: [
      `FROM ai-index-idx-${CASES_OUTCOMES_AI_INDEX_ID}`,
      `| WHERE type == "${CASE_OUTCOME_KI_TYPE}" AND id != ?self AND @timestamp >= NOW() - ${PRIOR_OUTCOMES_DAYS} days`,
      `| WHERE ${scope.join(' AND ')} AND (${match.join(' OR ')})`,
      '| KEEP id, title, attributes, @timestamp',
      '| SORT @timestamp DESC',
    ].join('\n'),
    params,
  };
};

const toOutcome = (row: Record<string, unknown>): PriorOutcome | undefined => {
  const attributes = (row.attributes ?? {}) as Record<string, unknown>;
  const caseId = typeof attributes.case_id === 'string' ? attributes.case_id : undefined;
  if (!caseId) return undefined;
  const incrementalId = Number(attributes.incremental_id);
  const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
  return {
    case_id: caseId,
    title: typeof row.title === 'string' ? row.title : caseId,
    ...(Number.isFinite(incrementalId) && attributes.incremental_id != null
      ? { incremental_id: incrementalId }
      : {}),
    ...(str(attributes.close_reason) ? { close_reason: str(attributes.close_reason) } : {}),
    ...(str(attributes.human_verdict) ? { human_verdict: str(attributes.human_verdict) } : {}),
    ...(str(attributes.closed_at) ?? str(row['@timestamp'])
      ? { closed_at: str(attributes.closed_at) ?? str(row['@timestamp']) }
      : {}),
  };
};

/**
 * Closed cases in the same space and owner that share this case's rules, hosts, users, or
 * observables, read from the knowledge index as the caller. Never throws for a missing index or
 * privilege: the case view treats Prior outcomes as a hint.
 */
export const getPriorOutcomes = async ({
  client,
  caseId,
  spaceId,
  isAvailable,
  query,
}: {
  client: CasesClient;
  caseId: string;
  spaceId: string;
  isAvailable: () => Promise<boolean>;
  query: PriorOutcomesQuery;
}): Promise<PriorOutcomesResponse> => {
  // Reads the case first, so the caller's Cases privileges (and restricted access) apply.
  const theCase = await client.cases.get({ id: caseId, includeComments: false });
  if (!(await isAvailable())) {
    return { available: false };
  }

  const { ruleNames } = await collectCaseOutcomeInputs(client, theCase, spaceId);
  const keys = getMatchKeysFromCase(theCase, spaceId, ruleNames);
  const matchTags = capMatchTags(getOutcomeMatchTags(keys));
  if (matchTags.length === 0) {
    return {
      available: true,
      days: PRIOR_OUTCOMES_DAYS,
      outcomes: [],
      total: 0,
      close_reasons: {},
    };
  }

  let response: Awaited<ReturnType<PriorOutcomesQuery>>;
  try {
    response = await query({
      ...buildPriorOutcomesQuery(getCaseOutcomeKiId(caseId), getOutcomeScopeTags(keys), matchTags),
      limit: QUERY_LIMIT,
    });
  } catch (error) {
    // Nothing published yet in this deployment: the backing index doesn't exist.
    if (
      /index_not_found|Unknown index/i.test(error instanceof Error ? error.message : String(error))
    ) {
      return {
        available: true,
        days: PRIOR_OUTCOMES_DAYS,
        outcomes: [],
        total: 0,
        close_reasons: {},
      };
    }
    // No read access to the knowledge index, or the query failed: the line hides.
    return { available: false };
  }

  const names = response.columns.map(({ name }) => name);
  const matched = response.values
    .map((values) => toOutcome(Object.fromEntries(names.map((name, i) => [name, values[i]]))))
    .filter((outcome): outcome is PriorOutcome => outcome !== undefined);
  // Only cases the caller can read now: a case restricted, deleted, or moved out of reach after
  // its outcome was published never shows here.
  const readable =
    matched.length === 0
      ? new Set<string>()
      : new Set(
          (await client.cases.bulkGet({ ids: matched.map(({ case_id: id }) => id) })).cases.map(
            ({ id }) => id
          )
        );
  const outcomes = matched.filter(({ case_id: id }) => readable.has(id));
  const closeReasons: Record<string, number> = {};
  for (const { close_reason: reason } of outcomes) {
    if (reason) closeReasons[reason] = (closeReasons[reason] ?? 0) + 1;
  }

  return {
    available: true,
    days: PRIOR_OUTCOMES_DAYS,
    outcomes: outcomes.slice(0, MAX_PRIOR_OUTCOMES),
    total: outcomes.length,
    close_reasons: closeReasons,
  };
};
