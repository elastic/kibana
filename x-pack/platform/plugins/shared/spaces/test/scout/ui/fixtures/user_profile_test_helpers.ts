/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileData } from '@kbn/core-user-profile-common';
import type { ApiClientFixture, SamlAuth } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'Kibana',
} as const;

export type InteractiveUserRole = 'admin' | 'viewer';

export type SpaceRecollectionSettings = Pick<
  NonNullable<UserProfileData['userSettings']>,
  'rememberSelectedSpace' | 'lastSelectedSpaceId'
>;

async function getInteractiveUserSettings(
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth,
  role: InteractiveUserRole
): Promise<UserProfileData['userSettings']> {
  const { cookieHeader } = await samlAuth.asInteractiveUser(role);
  const response = await apiClient.get('internal/security/user_profile?dataPath=userSettings', {
    headers: { ...cookieHeader, ...INTERNAL_HEADERS },
    responseType: 'json',
  });
  return response.body.data?.userSettings;
}

export async function updateInteractiveUserSettings(
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth,
  role: InteractiveUserRole,
  userSettings: SpaceRecollectionSettings
) {
  const { cookieHeader } = await samlAuth.asInteractiveUser(role);
  await apiClient.post('internal/security/user_profile/_data', {
    headers: { ...cookieHeader, ...INTERNAL_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify({ userSettings }),
    responseType: 'json',
  });
}

/**
 * Writes the settings and polls until the profile reads them back, re-writing on every
 * attempt. Entering a space triggers a fire-and-forget profile write on the server (see
 * `on_post_auth_interceptor`), so a write kicked off by an earlier test can land *after*
 * this one seeds its own state. Re-writing inside the poll makes the seed win regardless
 * of test ordering or Playwright retries.
 */
export async function ensureInteractiveUserSettings(
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth,
  role: InteractiveUserRole,
  userSettings: SpaceRecollectionSettings
) {
  await expect
    .poll(async () => {
      await updateInteractiveUserSettings(apiClient, samlAuth, role, userSettings);
      return await getInteractiveUserSettings(apiClient, samlAuth, role);
    })
    .toMatchObject(userSettings);
}

export async function waitForLastSelectedSpaceId(
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth,
  role: InteractiveUserRole,
  spaceId: string
) {
  await expect
    .poll(async () => {
      const settings = await getInteractiveUserSettings(apiClient, samlAuth, role);
      return settings?.lastSelectedSpaceId;
    })
    .toBe(spaceId);
}
