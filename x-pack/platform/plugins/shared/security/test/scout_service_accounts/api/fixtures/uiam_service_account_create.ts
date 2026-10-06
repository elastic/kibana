/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

export const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' } as const;

/**
 * Headers for managing UIAM service accounts. UIAM refuses to create them for session users, so
 * they carry the seeded organization key instead. The key exists only after an interactive login.
 */
export const ORG_ADMIN_HEADERS = {
  ...HEADERS,
  Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
} as const;

/** Creates a UIAM service account through Kibana and returns its id. */
export const createUiamServiceAccount = async (
  apiClient: ApiClientFixture,
  { name, roles }: { name: string; roles: readonly string[] }
): Promise<string> => {
  const created = await apiClient.post<{ id: string }>('internal/security/service_account', {
    headers: ORG_ADMIN_HEADERS,
    body: { name, roles },
    responseType: 'json',
  });
  expect(created).toHaveStatusCode(200);
  return created.body.id;
};
