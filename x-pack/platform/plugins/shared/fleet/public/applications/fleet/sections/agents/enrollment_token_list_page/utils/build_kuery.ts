/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ActiveFilter = 'active' | 'expired' | 'inactive' | 'all';

const NOT_HIDDEN_KUERY = 'not hidden:true';

// A token past its expiration can no longer enroll an agent, but nothing writes `active: false`
// back to its document, so expiry has to be part of the filter for each bucket to hold the tokens
// the list reports under that status.
const EXPIRED_KUERY = 'expire_at <= "now"';

export function buildKuery(
  search: string,
  selectedPolicyIds: string[],
  activeFilter: ActiveFilter,
  excludedPolicyIds: string[]
): string {
  const parts: string[] = [];

  if (search.trim() !== '') {
    parts.push(`(${search.trim()})`);
  }

  if (selectedPolicyIds.length > 0) {
    const policyFilter = selectedPolicyIds.map((id) => `policy_id:"${id}"`).join(' or ');
    parts.push(`(${policyFilter})`);
  }

  if (activeFilter === 'active') {
    parts.push(`(active:true and not (${EXPIRED_KUERY}))`);
  } else if (activeFilter === 'expired') {
    parts.push(`(active:true and ${EXPIRED_KUERY})`);
  } else if (activeFilter === 'inactive') {
    parts.push('(active:false)');
  }

  if (excludedPolicyIds.length > 0) {
    const exclusion = excludedPolicyIds.map((id) => `policy_id:"${id}"`).join(' or ');
    parts.push(`(not (${exclusion}))`);
  }

  parts.push(`(${NOT_HIDDEN_KUERY})`);

  return parts.join(' and ');
}
