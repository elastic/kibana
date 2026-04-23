/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import { ALL_SPACES_ID } from '../../../common/constants';

import { appContextService } from '../app_context';
import {
  getIsSpaceAwarenessEnabledCache,
  setIsSpaceAwarenessEnabledCache,
} from '../epm/packages/cache';
import { getSettingsOrUndefined } from '../settings';
import type { AgentPolicy, AgentPolicySOAttributes, PackagePolicy } from '../../types';

export const PENDING_MIGRATION_TIMEOUT = 60 * 60 * 1000;
/**
 * Return true if user optin for the space awareness feature.
 */
export async function isSpaceAwarenessEnabled(): Promise<boolean> {
  if (!appContextService.getExperimentalFeatures().useSpaceAwareness) {
    return false;
  }
  const cache = getIsSpaceAwarenessEnabledCache();
  if (typeof cache === 'boolean') {
    return cache;
  }

  const settings = await getSettingsOrUndefined(appContextService.getInternalUserSOClient());

  // @ts-expect-error upgrade typescript v5.9.3
  const res = settings?.use_space_awareness_migration_status === 'success' ?? false;
  setIsSpaceAwarenessEnabledCache(res);

  return res;
}

/**
 * Return true if space awareness migration is currently running
 */
export async function isSpaceAwarenessMigrationPending(): Promise<boolean> {
  if (!appContextService.getExperimentalFeatures().useSpaceAwareness) {
    return false;
  }

  const settings = await getSettingsOrUndefined(appContextService.getInternalUserSOClient());

  if (
    settings?.use_space_awareness_migration_status === 'pending' &&
    settings?.use_space_awareness_migration_started_at &&
    new Date(settings?.use_space_awareness_migration_started_at).getTime() >
      Date.now() - PENDING_MIGRATION_TIMEOUT
  ) {
    return true;
  }
  return false;
}

export function getSpaceForAgentPolicy(agentPolicy: Pick<AgentPolicy, 'space_ids'>): string {
  return getValidSpaceId(agentPolicy.space_ids);
}

export function getSpaceForAgentPolicySO(
  agentPolicySO: Pick<SavedObject<AgentPolicySOAttributes>, 'namespaces'>
): string {
  return getValidSpaceId(agentPolicySO.namespaces);
}

export function getSpaceForPackagePolicy(packagePolicy: Pick<PackagePolicy, 'spaceIds'>): string {
  return getValidSpaceId(packagePolicy.spaceIds);
}

export function getSpaceForPackagePolicySO(
  packagePolicySO: Pick<SavedObject<AgentPolicySOAttributes>, 'namespaces'>
): string {
  return getValidSpaceId(packagePolicySO.namespaces);
}

export function getValidSpaceId(spacedIds?: string[]) {
  const space = spacedIds?.[0];

  return space && space !== ALL_SPACES_ID ? space : DEFAULT_SPACE_ID;
}
