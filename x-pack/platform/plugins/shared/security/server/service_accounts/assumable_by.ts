/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRUSTED_PLATFORM_SERVICE_ACCOUNTS,
  type TrustedPlatformServiceAccountName,
  type UiamProjectType,
} from '@kbn/core-security-server';

import type { ServiceAccountAssumableBy } from '../uiam';

export interface BuildAssumableByParams {
  organizationId: string;
  projectId: string;
  projectType: UiamProjectType;
}

/**
 * Relay's platform service account. Matches relay-service Helm
 * `uiam.serviceAccountId` (SPIFFE `spiffe://relay-service.elastic.co`).
 * Not caller-supplied.
 */
const RELAY_PLATFORM_SERVICE_ACCOUNT_ID = 'relay-service';

const TRUSTED_PLATFORM_SERVICE_ACCOUNT_IDS: Record<TrustedPlatformServiceAccountName, string> = {
  relay: RELAY_PLATFORM_SERVICE_ACCOUNT_ID,
};

const isTrustedPlatformAssumer = (name: string): name is TrustedPlatformServiceAccountName =>
  (TRUSTED_PLATFORM_SERVICE_ACCOUNTS as readonly string[]).includes(name);

/**
 * Builds the principals allowed to exchange a service account's credentials.
 * The project entry is derived from this Kibana project. Named platform assumers
 * are resolved here; unknown names are rejected and never forwarded.
 */
export const buildAssumableBy = (
  { organizationId, projectId, projectType }: BuildAssumableByParams,
  trustedPlatformAssumers: readonly string[] = []
): ServiceAccountAssumableBy[] => {
  const assumableBy: ServiceAccountAssumableBy[] = [
    {
      type: 'project-service-account',
      organization_id: organizationId,
      project_type: projectType,
      project_id: projectId,
    },
  ];
  const seenPlatformIds = new Set<string>();

  for (const name of trustedPlatformAssumers) {
    if (!isTrustedPlatformAssumer(name)) {
      throw new Error(
        'Refusing an unknown platform service account assumer. Assumers are chosen by Kibana, not by the request.'
      );
    }
    const serviceAccountId = TRUSTED_PLATFORM_SERVICE_ACCOUNT_IDS[name];
    if (seenPlatformIds.has(serviceAccountId)) {
      continue;
    }
    seenPlatformIds.add(serviceAccountId);
    assumableBy.push({ type: 'platform-service-account', service_account_id: serviceAccountId });
  }

  return assumableBy;
};

/**
 * True when every named platform assumer is present on the account UIAM returned.
 * A missing entry means the account must not be handed to a caller.
 */
export const grantsTrustedPlatformAssumers = (
  assumableBy: readonly ServiceAccountAssumableBy[],
  trustedPlatformAssumers: readonly string[]
): boolean => {
  const requiredIds = new Set<string>();
  for (const name of trustedPlatformAssumers) {
    if (!isTrustedPlatformAssumer(name)) {
      return false;
    }
    requiredIds.add(TRUSTED_PLATFORM_SERVICE_ACCOUNT_IDS[name]);
  }

  const grantedIds = new Set(
    assumableBy.flatMap((entry) =>
      entry.type === 'platform-service-account' ? [entry.service_account_id] : []
    )
  );
  for (const id of requiredIds) {
    if (!grantedIds.has(id)) {
      return false;
    }
  }
  return true;
};
