/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery, escapeQuotes } from '@kbn/es-query';

import { AGENT_POLICY_SENTINEL_VERSION, AGENT_POLICY_VERSION_SEPARATOR } from '../constants';

const DEFAULT_POLICY_ID_FIELD = 'policy_id';

// Agent version part of a suffix, e.g. `9.2` in 'policy123#9.2'.
const AGENT_VERSION_PATTERN = '[0-9]+\\.[0-9]+';

// 'policy123#9.2' or the sentinel 'policy123#sentinel'
const VERSION_SUFFIX_REGEX = new RegExp(
  `${AGENT_POLICY_VERSION_SEPARATOR}(${AGENT_VERSION_PATTERN}|${AGENT_POLICY_SENTINEL_VERSION})$`
);

/**
 * Elasticsearch `regexp` query value matching the policy ids with an agent version suffix e.g.
 * 'policy123#9.2', but not the sentinel or ids that only contain a '#'. Keep in sync with
 * {@link classifyPolicyId}. `#` is a reserved character in Lucene regexps, so it is escaped.
 */
export const AGENT_VERSION_SUFFIX_ES_REGEXP = `.*\\${AGENT_POLICY_VERSION_SEPARATOR}${AGENT_VERSION_PATTERN}`;

export type ClassifiedPolicyId =
  | { kind: 'base'; baseId: string; version: null }
  | { kind: 'sentinel'; baseId: string; version: string }
  | { kind: 'agentVersion'; baseId: string; version: string };

/**
 * Single source of truth for the kind of a policy id, so callers switch on `kind` instead of
 * comparing suffixes themselves:
 * - `base`: no version suffix, e.g. 'policy123' (or 'policy#123', a '#' that is not a suffix)
 * - `sentinel`: 'policy123#sentinel', the non-version-specific copy of a policy
 * - `agentVersion`: 'policy123#9.2', a policy variant for agents of that version
 */
export function classifyPolicyId(policyId: string): ClassifiedPolicyId {
  const match = policyId ? VERSION_SUFFIX_REGEX.exec(policyId) : null;
  if (!match) {
    return { kind: 'base', baseId: policyId, version: null };
  }
  const version = match[1];
  return {
    kind: version === AGENT_POLICY_SENTINEL_VERSION ? 'sentinel' : 'agentVersion',
    baseId: policyId.slice(0, match.index),
    version,
  };
}

export function hasVersionSuffix(policyId: string): boolean {
  return classifyPolicyId(policyId).kind !== 'base';
}

/** Whether the policy id ends with the sentinel suffix, e.g. 'policy123#sentinel'. */
export function hasSentinelVersionSuffix(policyId: string): boolean {
  return classifyPolicyId(policyId).kind === 'sentinel';
}

/** Whether the policy id ends with an agent version suffix e.g. 'policy123#9.2', not the sentinel. */
export function hasAgentVersionSuffix(policyId: string): boolean {
  return classifyPolicyId(policyId).kind === 'agentVersion';
}

export function getSentinelVersionPolicyId(baseId: string): string {
  return `${baseId}${AGENT_POLICY_VERSION_SEPARATOR}${AGENT_POLICY_SENTINEL_VERSION}`;
}

export function splitVersionSuffixFromPolicyId(policyId: string): {
  baseId: string;
  version: string | null;
} {
  const { baseId, version } = classifyPolicyId(policyId);
  return { baseId, version };
}

export function removeVersionSuffixFromPolicyId(policyId: string): string {
  return splitVersionSuffixFromPolicyId(policyId).baseId;
}

/**
 * KQL fragment matching only the version-specific variants of a base policy id
 * (e.g. `policy_id:my-policy#*`) — NOT the base id itself.
 */
export function buildVersionVariantsKueryFragment(
  baseId: string,
  fieldName: string = DEFAULT_POLICY_ID_FIELD
): string {
  return `${fieldName}:${escapeKuery(baseId)}${AGENT_POLICY_VERSION_SEPARATOR}*`;
}

/**
 * KQL fragment matching only the agent version variants of a base policy id
 * (e.g. `policy_id:my-policy#* and not policy_id:"my-policy#sentinel"`) — NOT the base id itself
 * and NOT the sentinel. Wrapped in parentheses so it can be combined with other conditions.
 */
export function buildAgentVersionVariantsKueryFragment(
  baseId: string,
  fieldName: string = DEFAULT_POLICY_ID_FIELD
): string {
  return `(${buildVersionVariantsKueryFragment(
    baseId,
    fieldName
  )} and not ${fieldName}:"${escapeQuotes(getSentinelVersionPolicyId(baseId))}")`;
}

/**
 * KQL matching a base policy id or any of its version-specific variants, e.g.
 * `(policy_id:"my-policy" or policy_id:my-policy#*)`. Canonical replacement for hand-rolled
 * copies of this query across Fleet.
 */
export function buildPolicyIdOrVariantsKuery(
  baseId: string,
  fieldName: string = DEFAULT_POLICY_ID_FIELD
): string {
  return `(${fieldName}:"${escapeQuotes(baseId)}" or ${buildVersionVariantsKueryFragment(
    baseId,
    fieldName
  )})`;
}

/**
 * Same as {@link buildPolicyIdOrVariantsKuery}, for multiple base policy ids at once, e.g.
 * `(policy_id:(policy-1 or policy-2) or policy_id:policy-1#* or policy_id:policy-2#*)`.
 */
export function buildPolicyIdsOrVariantsKuery(
  baseIds: string[],
  fieldName: string = DEFAULT_POLICY_ID_FIELD
): string {
  const uniqueIds = Array.from(new Set(baseIds));
  if (uniqueIds.length === 0) {
    // No ids to match. `${fieldName}:()` is invalid KQL syntax (parse error), so return a
    // valid kuery that never matches instead — a real policy_id is never an empty string.
    return `${fieldName}:""`;
  }
  const exactClause = `${fieldName}:(${uniqueIds
    .map((baseId) => escapeKuery(baseId))
    .join(' or ')})`;
  const variantClauses = uniqueIds.map((baseId) =>
    buildVersionVariantsKueryFragment(baseId, fieldName)
  );
  return `(${[exactClause, ...variantClauses].join(' or ')})`;
}

/**
 * ES query DSL fragment matching only the version-specific variants of a base policy id —
 * NOT the base id itself.
 */
export function buildVersionVariantsEsFilter(
  baseId: string,
  fieldName: string = DEFAULT_POLICY_ID_FIELD
) {
  return { prefix: { [fieldName]: `${baseId}${AGENT_POLICY_VERSION_SEPARATOR}` } };
}

/**
 * ES query DSL filter matching only the agent version variants of a base policy id — NOT the base
 * id itself and NOT the sentinel.
 */
export function buildAgentVersionVariantsEsFilter(
  baseId: string,
  fieldName: string = DEFAULT_POLICY_ID_FIELD
) {
  return {
    bool: {
      filter: [buildVersionVariantsEsFilter(baseId, fieldName)],
      must_not: [{ term: { [fieldName]: getSentinelVersionPolicyId(baseId) } }],
    },
  };
}

/**
 * ES query DSL filter matching a base policy id or any of its version-specific variants.
 * Canonical replacement for hand-rolled `bool.should[{term},{prefix}]` queries.
 */
export function buildPolicyIdOrVariantsEsFilter(
  baseId: string,
  fieldName: string = DEFAULT_POLICY_ID_FIELD
) {
  return {
    bool: {
      should: [{ term: { [fieldName]: baseId } }, buildVersionVariantsEsFilter(baseId, fieldName)],
      minimum_should_match: 1,
    },
  };
}

/**
 * Same as {@link buildPolicyIdOrVariantsEsFilter}, for multiple base policy ids at once
 * (e.g. for a `terms` lookup across several agent policies).
 */
export function buildPolicyIdsOrVariantsEsFilter(
  baseIds: string[],
  fieldName: string = DEFAULT_POLICY_ID_FIELD
) {
  const uniqueIds = Array.from(new Set(baseIds));
  if (uniqueIds.length === 0) {
    return { match_none: {} };
  }
  return {
    bool: {
      should: [
        { terms: { [fieldName]: uniqueIds } },
        ...uniqueIds.map((baseId) => buildVersionVariantsEsFilter(baseId, fieldName)),
      ],
      minimum_should_match: 1,
    },
  };
}

// TODO: Remove these two fallback helpers once all fleet-server versions in use populate
// policy_base_id on agent enrolment. Until then, agents enrolled via an older fleet-server
// during a mixed-version rollout will lack the field and must be matched via the legacy
// policy_id exact-term path. No prefix is used so that the query remains compatible with
// search.allow_expensive_queries:false; versioned policy_id values (e.g. policy-id#9.3)
// without a policy_base_id can only arise in the narrow window of a mixed-version rollout,
// and the startup backfill covers all pre-existing documents.

/**
 * KQL equivalent of {@link buildPolicyBaseIdWithFallbackEsFilter}: matches migrated documents via
 * `policy_base_id:"id"` and un-migrated documents via `policy_id:"id" and not policy_base_id:*`.
 * Use this when building a KQL string (e.g. for URL kuery params) instead of an ES DSL filter.
 */
export function buildPolicyBaseIdWithFallbackKuery(
  baseId: string,
  policyBaseIdField: string = 'policy_base_id',
  policyIdField: string = DEFAULT_POLICY_ID_FIELD
): string {
  const escapedId = escapeQuotes(baseId);
  return `(${policyBaseIdField}:"${escapedId}" or (${policyIdField}:"${escapedId}" and not ${policyBaseIdField}:*))`;
}

/**
 * Same as {@link buildPolicyBaseIdWithFallbackKuery}, for multiple base policy ids at once.
 */
export function buildPolicyBaseIdsWithFallbackKuery(
  baseIds: string[],
  policyBaseIdField: string = 'policy_base_id',
  policyIdField: string = DEFAULT_POLICY_ID_FIELD
): string {
  const uniqueIds = Array.from(new Set(baseIds));
  if (uniqueIds.length === 0) {
    return `${policyIdField}:""`;
  }
  const idList = uniqueIds.map((id) => escapeKuery(id)).join(' or ');
  return `(${policyBaseIdField}:(${idList}) or (${policyIdField}:(${idList}) and not ${policyBaseIdField}:*))`;
}

/**
 * ES query DSL filter preferring `policy_base_id` for migrated documents, with a legacy
 * `policy_id` exact-term fallback for documents that pre-date the `policy_base_id` field.
 */
export function buildPolicyBaseIdWithFallbackEsFilter(
  baseId: string,
  policyBaseIdField: string = 'policy_base_id',
  policyIdField: string = DEFAULT_POLICY_ID_FIELD
) {
  return {
    bool: {
      should: [
        { term: { [policyBaseIdField]: baseId } },
        {
          bool: {
            filter: [{ term: { [policyIdField]: baseId } }],
            must_not: [{ exists: { field: policyBaseIdField } }],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
}

/**
 * Same as {@link buildPolicyBaseIdWithFallbackEsFilter}, for multiple base policy ids at once.
 */
export function buildPolicyBaseIdsWithFallbackEsFilter(
  baseIds: string[],
  policyBaseIdField: string = 'policy_base_id',
  policyIdField: string = DEFAULT_POLICY_ID_FIELD
) {
  const uniqueIds = Array.from(new Set(baseIds));
  if (uniqueIds.length === 0) {
    return { match_none: {} };
  }
  return {
    bool: {
      should: [
        { terms: { [policyBaseIdField]: uniqueIds } },
        {
          bool: {
            filter: [{ terms: { [policyIdField]: uniqueIds } }],
            must_not: [{ exists: { field: policyBaseIdField } }],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
}
