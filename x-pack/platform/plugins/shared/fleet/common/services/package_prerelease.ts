/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentlessDeploymentReleaseStatus } from '../types';
import type { IntegrationCardReleaseLabel, RegistryRelease } from '../types';

import {
  getAgentlessRelease,
  isDefaultAgentlessIntegration,
  isOnlyAgentlessIntegration,
  type PackageWithDeploymentInfo,
} from './agentless_policy_helper';

export function isPackagePrerelease(version: string): boolean {
  // derive from semver
  return version.startsWith('0') || version.includes('-');
}

export function getPackageReleaseLabel(version: string): IntegrationCardReleaseLabel {
  if (version.startsWith('0') || version.includes('-preview')) {
    return 'preview';
  } else if (version.includes('-rc')) {
    return 'rc';
  } else if (version.includes('-')) {
    return 'beta';
  }
  return 'ga';
}

export function mapPackageReleaseToIntegrationCardRelease(
  release: RegistryRelease
): IntegrationCardReleaseLabel {
  return release === 'experimental' ? 'preview' : release;
}

/**
 * Returns the agentless-specific release when it should override the package semver release,
 * or `undefined` if no agentless override applies.
 * Covers three contexts: only-agentless deployment, agentless-is-default deployment,
 * and an explicit agentless filter view (`options.isAgentlessContext`).
 */
export function getAgentlessReleaseOverride(
  packageInfo?: PackageWithDeploymentInfo,
  integrationToEnable?: string,
  options?: { isAgentlessContext?: boolean }
): Exclude<AgentlessDeploymentReleaseStatus, AgentlessDeploymentReleaseStatus.GA> | undefined {
  if (
    isOnlyAgentlessIntegration(packageInfo, integrationToEnable) ||
    isDefaultAgentlessIntegration(packageInfo, integrationToEnable) ||
    options?.isAgentlessContext
  ) {
    const release = getAgentlessRelease(packageInfo, integrationToEnable);
    if (release !== undefined && release !== AgentlessDeploymentReleaseStatus.GA) return release;
  }
  return undefined;
}

/**
 * Resolves the full effective release label for a package, incorporating an agentless-specific
 * override when relevant and falling back to the semver-derived release otherwise.
 */
export function resolveEffectiveRelease(
  packageInfo?: PackageWithDeploymentInfo & { version?: string },
  integrationToEnable?: string,
  options?: { isAgentlessContext?: boolean }
): IntegrationCardReleaseLabel {
  if (!packageInfo) return 'ga';
  const override = getAgentlessReleaseOverride(packageInfo, integrationToEnable, options);
  if (override !== undefined) return override;
  return getPackageReleaseLabel(packageInfo.version ?? '');
}
