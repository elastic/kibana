/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { apiTest, COMMON_HEADERS } from '../../../scout_uiam_client_auth_local/api/fixtures';

// Kibana has a valid secret, but must not add it to an incoming bearer token.
apiTest.describe(
  '[NON-MKI] UIAM bearer client authentication passthrough',
  { tag: tags.serverless.security.complete },
  () => {
    for (const { description, clientHeaders } of [
      { description: 'missing', clientHeaders: {} },
      {
        description: 'invalid',
        clientHeaders: { [ES_CLIENT_AUTHENTICATION_HEADER]: 'invalid-gateway-secret' },
      },
    ]) {
      apiTest(
        `does not replace ${description} client authentication with the Kibana secret`,
        async ({ apiClient, ephemeralToken }) => {
          const response = await apiClient.get('internal/security/me', {
            headers: {
              ...COMMON_HEADERS,
              Authorization: `Bearer ${ephemeralToken}`,
              ...clientHeaders,
            },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(401);
        }
      );
    }
  }
);
