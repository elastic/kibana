/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import coerce from 'semver/functions/coerce';
import compare from 'semver/functions/compare';
import lt from 'semver/functions/lt';
import satisfies from 'semver/functions/satisfies';
import minVersion from 'semver/ranges/min-version';
import validRange from 'semver/ranges/valid';

import type { AgentPolicyAgentVersionCondition } from '../types';

/**
 * The version a package-level agent version condition is evaluated against for an agent on
 * `agentVersion`, or `null` when the version cannot be parsed. Fleet places agents in
 * `major.minor` version-specific policies and filters the inputs of each one against that
 * `major.minor` coerced to `major.minor.0`, so `9.4.8` is evaluated as `9.4.0`. Prerelease
 * versions such as `9.6.0-SNAPSHOT` become `9.6.0` the same way.
 */
const getRuntimeAgentVersion = (agentVersion: string): string | null => {
  const coerced = coerce(agentVersion);
  return coerced ? `${coerced.major}.${coerced.minor}.0` : null;
};

/**
 * Whether Fleet keeps an integration's inputs for an agent on `agentVersion` under the
 * package-level `versionCondition`, evaluated the way version-specific policies evaluate it.
 * Returns `undefined` when the agent version cannot be parsed, as such agents are never moved
 * to a version-specific policy.
 */
export const agentSatisfiesPackageVersionCondition = (
  agentVersion: string,
  versionCondition: string
): boolean | undefined => {
  const runtimeVersion = getRuntimeAgentVersion(agentVersion);
  if (!runtimeVersion) return undefined;
  return satisfies(runtimeVersion, versionCondition);
};

/**
 * Whether version-specific policies drop an integration's inputs for an agent on `agentVersion`
 * under the package-level `versionCondition`. A range that cannot be parsed drops them for every
 * agent, while agents whose version cannot be parsed are never moved to a version-specific policy
 * and keep them.
 */
export const agentLosesPackageInputs = (agentVersion: string, versionCondition: string): boolean =>
  getRuntimeAgentVersion(agentVersion) !== null &&
  (!validRange(versionCondition) ||
    agentSatisfiesPackageVersionCondition(agentVersion, versionCondition) === false);

/**
 * The integrations of an agent policy that an agent on `agentVersion` is too old to run. Pass
 * `packageName` to look at a single integration. A version or range that cannot be parsed is
 * ignored, since `satisfies` would reject the agent for something nobody can act on.
 */
export const getIncompatibleIntegrations = ({
  agentVersion,
  conditions,
  packageName,
}: {
  agentVersion?: string;
  conditions?: AgentPolicyAgentVersionCondition[] | null;
  packageName?: string;
}): AgentPolicyAgentVersionCondition[] => {
  if (!agentVersion || !conditions) return [];
  return conditions.filter(
    ({ name, version_condition: versionCondition }) =>
      (packageName === undefined || name === packageName) &&
      !!validRange(versionCondition) &&
      agentSatisfiesPackageVersionCondition(agentVersion, versionCondition) === false
  );
};

export interface AgentVersionBlockers {
  /** Number of agents that would lose the integration's inputs. */
  blockedCount: number;
  /** The reported versions of those agents, sorted. */
  blockingVersions: string[];
  /**
   * The lowest `major.minor.0` version satisfying the condition, only set when it is above every
   * blocking version, so that it can be suggested as an agent upgrade target.
   */
  minVersion?: string;
}

/** Compares agent versions in semver order, falling back to text order for invalid versions. */
const compareAgentVersions = (a: string, b: string): number => {
  const [coercedA, coercedB] = [coerce(a), coerce(b)];
  if (!coercedA || !coercedB) return a.localeCompare(b);
  return compare(coercedA, coercedB) || a.localeCompare(b);
};

// How many minor versions past the range's minimum version are tried to find an upgrade target
const MAX_MINOR_VERSIONS_TO_TRY = 100;

/**
 * The lowest version an agent can be upgraded to for `versionCondition` to keep its inputs. As
 * agents are evaluated at `major.minor.0`, this is the lowest `major.minor.0` satisfying the
 * condition, e.g. `9.4.0` for `>=9.3.5` and `9.6.0` for `~9.4.6 || ~9.5.3 || ^9.6.0`.
 */
const getLowestSatisfyingRuntimeVersion = (versionCondition: string): string | undefined => {
  const lowest = minVersion(versionCondition);
  if (!lowest) return undefined;
  for (let minor = lowest.minor; minor <= lowest.minor + MAX_MINOR_VERSIONS_TO_TRY; minor++) {
    const candidate = `${lowest.major}.${minor}.0`;
    if (satisfies(candidate, versionCondition)) return candidate;
  }
  return undefined;
};

/**
 * The agents, among `agentVersionCounts`, that would lose an integration's inputs under the
 * package-level `versionCondition`. Unlike {@link getIncompatibleIntegrations}, a range that
 * cannot be parsed blocks every agent: Fleet's version-specific policies drop the inputs for
 * every agent in that case.
 */
export const getAgentVersionBlockers = ({
  versionCondition,
  agentVersionCounts,
}: {
  versionCondition: string;
  agentVersionCounts: ReadonlyArray<{ version: string; count: number }>;
}): AgentVersionBlockers => {
  const isValidRange = !!validRange(versionCondition);
  const blocking = agentVersionCounts.filter(
    ({ version, count }) => count > 0 && agentLosesPackageInputs(version, versionCondition)
  );
  // Sorted by version, as the error message only lists the first ones
  const blockingVersions = [...new Set(blocking.map(({ version }) => version))].sort(
    compareAgentVersions
  );
  const blockedCount = blocking.reduce((total, { count }) => total + count, 0);

  const lowestSatisfying = isValidRange
    ? getLowestSatisfyingRuntimeVersion(versionCondition)
    : undefined;
  const isUpgradeTarget =
    !!lowestSatisfying &&
    blockingVersions.every((version) => {
      const runtimeVersion = getRuntimeAgentVersion(version);
      return !!runtimeVersion && lt(runtimeVersion, lowestSatisfying);
    });

  return {
    blockedCount,
    blockingVersions,
    ...(isUpgradeTarget && blockedCount > 0 ? { minVersion: lowestSatisfying } : {}),
  };
};
