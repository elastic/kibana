/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import type { GetTransformNodesResponseSchema } from '../../../../server/routes/api_schemas/transforms';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('/internal/transform/transforms/_nodes', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  let transformViewerUserApiCredentials: RoleApiCredentials;
  let unauthorizedApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
    unauthorizedApiCredentials = await requestAuth.getApiKeyForCustomRole({
      kibana: [
        {
          base: ['all'],
          feature: {},
          spaces: ['*'],
        },
      ],
      elasticsearch: {
        cluster: [],
        indices: [],
      },
    });
  });

  apiTest(
    'should return the number of available transform nodes for a power user',
    async ({ apiClient }) => {
      const { statusCode, body } = await apiClient.get('internal/transform/transforms/_nodes', {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });
      const nodesResponse = body as GetTransformNodesResponseSchema;

      expect(statusCode).toBe(200);

      expect(nodesResponse.count).toBeGreaterThanOrEqual(1);
    }
  );

  apiTest(
    'should return the number of available transform nodes for a viewer user',
    async ({ apiClient }) => {
      const { statusCode, body } = await apiClient.get('internal/transform/transforms/_nodes', {
        headers: {
          ...COMMON_HEADERS,
          ...transformViewerUserApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });
      const nodesResponse = body as GetTransformNodesResponseSchema;

      expect(statusCode).toBe(200);

      expect(nodesResponse.count).toBeGreaterThanOrEqual(1);
    }
  );

  apiTest(
    'should not return the number of available transform nodes for an unauthorized user',
    async ({ apiClient }) => {
      const { statusCode } = await apiClient.get('internal/transform/transforms/_nodes', {
        headers: {
          ...COMMON_HEADERS,
          ...unauthorizedApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(403);
    }
  );
});
