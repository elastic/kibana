/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdentifiers } from '../types';

/** Matches Elasticsearch `cloud-saml-kibana` realm used for Elastic Cloud SSO. */
export const ELASTIC_CLOUD_SSO_REALM_NAME = 'cloud-saml-kibana' as const;

interface ApiKeyRecord {
  profile_uid?: string | null;
  username?: string | null;
  realm?: string | null;
}

export function mapFirstApiKeyToUserIdentifiers(
  apiKeys: ApiKeyRecord[] | undefined
): UserIdentifiers | undefined {
  if (!apiKeys?.length) {
    return undefined;
  }

  const { profile_uid: profileUid, username, realm } = apiKeys[0];
  const userCloudId = realm === ELASTIC_CLOUD_SSO_REALM_NAME ? username ?? undefined : undefined;

  if (profileUid || userCloudId) {
    return { profileUid: profileUid ?? undefined, userCloudId };
  }

  return undefined;
}
