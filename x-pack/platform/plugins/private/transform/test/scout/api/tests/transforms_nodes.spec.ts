/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { GetTransformNodesResponseSchema } from '../../../../common';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('/internal/transform/transforms/_nodes', { tag: tags.stateful.all }, () => {
  apiTest(
    'should return the number of available transform nodes for a transform manager',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const { statusCode, body } = await apiClient.get('internal/transform/transforms/_nodes', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      });
      const nodesResponse = body as GetTransformNodesResponseSchema;

      expect(statusCode).toBe(200);

      expect(nodesResponse.count).toBeGreaterThan(0);
    }
  );

  apiTest(
    'should return the number of available transform nodes for a viewer user',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const { statusCode, body } = await apiClient.get('internal/transform/transforms/_nodes', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      });
      const nodesResponse = body as GetTransformNodesResponseSchema;

      expect(statusCode).toBe(200);

      expect(nodesResponse.count).toBeGreaterThan(0);
    }
  );

  apiTest(
    'should not return the number of available transform nodes for an unauthorized user',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformUnauthorizedUser();

      const { statusCode } = await apiClient.get('internal/transform/transforms/_nodes', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(403);
    }
  );
});
