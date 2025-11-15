/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import semverSatisfies from 'semver/functions/satisfies';
import minVersion from 'semver/ranges/min-version';
import semverRcompare from 'semver/functions/rcompare';
import semverCompare from 'semver/functions/compare';

import { fetchAllAgentsByKuery } from './crud';

// ============================================================================
// Version Range Parsing Utilities
// ============================================================================

/**
 * Extracts the minimum agent version from multiple semver ranges.
 * For each range, extracts the minimum version (handling OR clauses).
 * Then returns the maximum of all extracted minimum versions (most restrictive requirement).
 *
 * @param ranges - Array of semver range strings from different package policies
 * @returns The minimum agent version that satisfies all requirements, or undefined if no valid ranges
 */
export function extractMinVersionFromRanges(ranges: string[]): string | undefined {
  if (!ranges || ranges.length === 0) {
    return undefined;
  }

  const extractedMinVersions: string[] = [];
  for (const range of ranges) {
    const minVer = extractMinVersionFromRangeWithOr(range);
    if (minVer) {
      extractedMinVersions.push(minVer);
    }
  }

  if (extractedMinVersions.length === 0) {
    return undefined;
  }

  // Sort in descending order - the first one is the highest (most restrictive) requirement
  const sortedVersions = [...extractedMinVersions].sort(semverRcompare);
  return sortedVersions[0];
}

/**
 * Extracts the minimum version from a semver range that may contain OR clauses.
 * For ranges like "^8.13.0 || ^9.0.0", splits by "||" and takes the minimum
 * across all OR clauses.
 *
 * @param range - A semver range string that may contain OR clauses (e.g., "^8.13.0 || ^9.0.0")
 * @returns The minimum version string, or undefined if the range cannot be parsed
 */
export function extractMinVersionFromRangeWithOr(range: string): string | undefined {
  // Split by "||" to handle OR ranges
  const orClauses = range.split(/\s*\|\|\s*/).map((clause) => clause.trim());

  const minVersions: string[] = [];
  for (const clause of orClauses) {
    const minVer = extractMinVersionFromRange(clause);
    if (minVer) {
      minVersions.push(minVer);
    }
  }

  if (minVersions.length === 0) {
    return undefined;
  }

  // Sort in ascending order and take the first (lowest minimum version)
  // This gives us the lowest minimum version across all OR clauses
  const sortedVersions = [...minVersions].sort(semverCompare);
  return sortedVersions[0];
}

/**
 * Extracts the minimum version from a semver range string.
 * Handles ranges like "^9.2.0", ">=8.13.0", "~9.0.0", etc.
 *
 * @param range - A semver range string (e.g., "^9.2.0", ">=8.13.0")
 * @returns The minimum version string, or undefined if the range cannot be parsed
 */
export function extractMinVersionFromRange(range: string): string | undefined {
  // Handle empty, null, undefined, or whitespace-only strings
  if (!range || typeof range !== 'string' || range.trim().length === 0) {
    return undefined;
  }
  try {
    const min = minVersion(range);
    if (!min) {
      return undefined;
    }
    // minVersion('') returns { version: '0.0.0' }, so we need to reject 0.0.0
    // as it indicates an invalid/empty input (no real package would require 0.0.0)
    if (min.version === '0.0.0') {
      return undefined;
    }
    return min.version;
  } catch (error) {
    // If range cannot be parsed, return undefined
    return undefined;
  }
}

// ============================================================================
// Compatibility Checking
// ============================================================================

export interface AgentVersionGateParams {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  policyIds: string[];
  requiredVersion: string;
  spaceId?: string;
}

/**
 * Returns true if at least one agent is on a version that does not satisfy the requiredVersion
 * (which can be a semver range like "^9.2.0" or "^8.13.0 || ^9.0.0") among agents enrolled
 * in the given policyIds. Returns false if all agents satisfy the requirement (or no agents found).
 */
export async function isAnyAgentBelowRequiredVersion({
  esClient,
  soClient,
  policyIds,
  requiredVersion,
  spaceId,
}: AgentVersionGateParams): Promise<boolean> {
  if (!policyIds.length) return false;

  const kuery = `policy_id: (${policyIds.map((policyId) => `"${policyId}"`).join(' or ')})`;
  const agentIterator = await fetchAllAgentsByKuery(esClient, soClient, {
    kuery,
    spaceId,
  });

  for await (const agents of agentIterator) {
    for (const agent of agents) {
      const version =
        agent.agent?.version || (agent.local_metadata as any)?.elastic?.agent?.version;
      if (version && !semverSatisfies(version, requiredVersion)) {
        return true;
      }
    }
  }

  return false;
}
