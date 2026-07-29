/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery, escapeQuotes } from '@kbn/es-query';

import { AGENT_POLICY_VERSION_SEPARATOR } from '../constants';

const DEFAULT_POLICY_ID_FIELD = 'policy_id';

export function hasVersionSuffix(policyId: string): boolean {
  if (!policyId) {
    return false;
  }
  // policy ends with version suffix e.g. 'policy123#9.2'
  return Boolean(policyId.match(/#\d+\.\d+$/));
}

export function splitVersionSuffixFromPolicyId(policyId: string): {
  baseId: string;
  version: string | null;
} {
  if (!hasVersionSuffix(policyId)) {
    return { baseId: policyId, version: null };
  }
  const separatorIndex = policyId.lastIndexOf(AGENT_POLICY_VERSION_SEPARATOR);
  const baseId = policyId.slice(0, separatorIndex);
  const version = policyId.slice(separatorIndex + 1);
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
