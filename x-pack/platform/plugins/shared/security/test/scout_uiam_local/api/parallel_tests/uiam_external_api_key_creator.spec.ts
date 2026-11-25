/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures';

// The only external (user-created) key of the local UIAM server is the seeded org admin key, and
// every login through the Mock IdP re-seeds it with the user who logged in as its creator. Specs
// run in parallel, so its creator is whoever logged in last, and this test does not expect a
// particular user.
apiTest.describe(
  '[NON-MKI] External (user-created) UIAM API key',
  {
    tag: [
      '@local-serverless-search',
      '@local-serverless-observability_complete',
      '@local-serverless-observability_logs_essentials',
      '@local-serverless-security_complete',
      '@local-serverless-security_essentials',
      '@local-serverless-security_ease',
      '@local-serverless-vectordb',
    ],
  },
  () => {
    apiTest('authenticates as the user who created the key', async ({ apiClient }) => {
      const response = await apiClient.get('internal/security/me', {
        headers: { ...COMMON_HEADERS, Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}` },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      // The key still identifies itself and is still external, but acts as a Cloud user, as an
      // Elasticsearch API key acts as its owner.
      expect(response.body.api_key.internal).toBe(false);
      expect(typeof response.body.api_key.id).toBe('string');
      expect(response.body.username).toMatch(/^\d+$/);
      expect(response.body.username).not.toBe(response.body.api_key.id);
    });
  }
);
