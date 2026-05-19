/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery, escapeQuotes } from '@kbn/es-query';

import { AGENTS_PREFIX, AGENT_POLICY_VERSION_SEPARATOR } from '../constants';

/**
 * Returns a safely-escaped KQL term for an exact-match lookup, including
 * surrounding double quotes. Safe for use inside a broader KQL expression.
 */
export const escapeKueryValue = (value: string): string => `"${escapeQuotes(value)}"`;

/**
 * Builds a KQL clause that matches agents assigned to a parent policy OR any
 * of its version-specific child policies (`<policyId>#<version>`).
 *
 * Both branches are safely escaped so a policy id containing KQL-special
 * characters (quotes, backslashes, colons, etc.) cannot break the parser.
 *
 * Wildcard semantics: escapeKuery is applied only to `policyId`; the trailing
 * literal `#*` is concatenated afterwards so the `*` is never escaped and
 * continues to act as a KQL wildcard.
 */
export const buildAgentPolicyIdKuery = (
  policyId: string,
  {
    prefix = AGENTS_PREFIX,
    includeVersionSpecific = true,
  }: { prefix?: string; includeVersionSpecific?: boolean } = {}
): string => {
  const exact = `${prefix}.policy_id:${escapeKueryValue(policyId)}`;
  if (!includeVersionSpecific) return exact;
  const wildcard = `${prefix}.policy_id:${escapeKuery(policyId)}${AGENT_POLICY_VERSION_SEPARATOR}*`;
  return `(${exact} or ${wildcard})`;
};
