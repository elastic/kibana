/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUiamOAuthAccessToken, MOCK_IDP_GATEWAY_SHARED_SECRET } from '@kbn/mock-idp-utils';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { apiTest, COMMON_HEADERS, COMMON_UNSAFE_HEADERS, TEST_USERNAME } from '../fixtures';
import { MCP_ENDPOINT } from '../fixtures/oauth_providers';

const ES_SELF_CALL_TARGET = '/internal/test_endpoints/self_client/fake_request';
const OAUTH_SELF_CALL_TARGET = '/internal/test_endpoints/self_client/oauth_me';

apiTest.describe(
  '[NON-MKI] Genuine Kibana self-call UIAM attestation after OAuth swap and relay',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest(
      'OAuth ephemeral self-call stamp survives the token swap so the acceptUiamOAuth receiver skips a second exchange',
      async ({ apiClient, kbnUrl, config: { organizationId, projectType } }) => {
        const audience = `${new URL(kbnUrl.get()).origin}/${MCP_ENDPOINT}`;
        const oauthAccessToken = await createUiamOAuthAccessToken({
          username: '1234567890',
          organizationId: organizationId!,
          projectType: projectType!,
          roles: ['admin'],
          email: 'elastic_admin@elastic.co',
          audience,
        });

        const response = await apiClient.post('test_endpoints/self_client/as_scoped_oauth', {
          headers: {
            ...COMMON_UNSAFE_HEADERS,
            Authorization: `Bearer ${oauthAccessToken}`,
          },
          responseType: 'json',
          body: { path: OAUTH_SELF_CALL_TARGET },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));
      }
    );

    apiTest(
      'Relayed token self-call withholds the stamp and forwards the upstream secret to ES',
      async ({ apiClient, ephemeralToken }) => {
        const relayHeaders = {
          ...COMMON_UNSAFE_HEADERS,
          Authorization: `Bearer ${ephemeralToken}`,
          [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
        };

        const response = await apiClient.post('test_endpoints/self_client/as_scoped', {
          headers: relayHeaders,
          responseType: 'json',
          body: { path: ES_SELF_CALL_TARGET },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: TEST_USERNAME }));
      }
    );

    apiTest(
      'Relayed token self-call to an acceptUiamOAuth route is treated like an external call',
      async ({ apiClient, ephemeralToken }) => {
        const relayAuth = {
          Authorization: `Bearer ${ephemeralToken}`,
          [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
        };

        const external = await apiClient.get('internal/test_endpoints/self_client/oauth_me', {
          headers: { ...COMMON_HEADERS, ...relayAuth },
          responseType: 'json',
        });

        const selfCall = await apiClient.post('test_endpoints/self_client/as_scoped', {
          headers: { ...COMMON_UNSAFE_HEADERS, ...relayAuth },
          responseType: 'json',
          body: { path: OAUTH_SELF_CALL_TARGET },
        });

        expect(selfCall.statusCode).toBe(external.statusCode);
      }
    );
  }
);
