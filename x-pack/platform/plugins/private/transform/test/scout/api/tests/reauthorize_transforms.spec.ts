/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import type { ReauthorizeTransformsRequestSchema } from '../../../../common';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import {
  expectUnauthorizedTransform,
  expectReauthorizedTransform,
} from '../helpers/transform_assertions';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

// If transform was created with sufficient permissions -> should create and start
// If transform was created with insufficient permissions -> should create but not start
apiTest.describe('/internal/transform/reauthorize_transforms', { tag: tags.stateful.all }, () => {
  let transformViewerUserApiCredentials: RoleApiCredentials;

  const transformCreatedByViewerId = getTransformIdByUser('transform_viewer');
  const invalidTransformId = 'invalid_transform_id';

  function getTransformIdByUser(username: string) {
    return `transform-by-${username}`;
  }

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    const transformCreatedByViewerRequest = {
      ...generateTransformConfig(transformCreatedByViewerId, true),
      transform_id: transformCreatedByViewerId,
      defer_validation: true,
    };
    await apiServices.transform.createTransformWithSecondaryAuth(
      transformCreatedByViewerRequest,
      transformViewerUserApiCredentials.apiKey.encoded
    );
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
    await apiServices.transform.deleteIndices({
      index: generateDestIndex(transformCreatedByViewerId),
    });
  });

  // single transform reauthorize_transforms
  apiTest(
    'should not reauthorize transform created by transform viewer for transform unauthorized',
    async ({ apiClient, apiServices, samlAuth }) => {
      const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];
      const transformUnauthorizedUserSessionCookie = await samlAuth
        .asTransformUnauthorizedUser()
        .then((c) => c.cookieHeader);

      const { statusCode, body } = await apiClient.post(
        'internal/transform/reauthorize_transforms',
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformUnauthorizedUserSessionCookie,
          },
          body: reqBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body[transformCreatedByViewerId].success).toBe(false);
      expect(typeof body[transformCreatedByViewerId].error).toBe('object');

      await expectUnauthorizedTransform(
        transformCreatedByViewerId,
        transformViewerUserApiCredentials,
        apiServices
      );
    }
  );

  apiTest(
    'should not reauthorize transform created by transform viewer for transform viewer',
    async ({ apiClient, samlAuth, apiServices }) => {
      const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];

      const transformViewerUserSessionCookie = await samlAuth
        .asTransformViewer()
        .then((c) => c.cookieHeader);

      const { statusCode, body } = await apiClient.post(
        'internal/transform/reauthorize_transforms',
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformViewerUserSessionCookie,
          },
          body: reqBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body[transformCreatedByViewerId].success).toBe(false);
      expect(typeof body[transformCreatedByViewerId].error).toBe('object');

      await expectUnauthorizedTransform(
        transformCreatedByViewerId,
        transformViewerUserApiCredentials,
        apiServices
      );
    }
  );

  apiTest(
    'should reauthorize transform created by transform viewer with new api key of transform manager and start the transform',
    async ({ apiClient, samlAuth, apiServices }) => {
      const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];
      const transformManagerSessionCookie = await samlAuth
        .asTransformManager()
        .then((c) => c.cookieHeader);

      const { statusCode, body } = await apiClient.post(
        'internal/transform/reauthorize_transforms',
        {
          headers: {
            ...COMMON_HEADERS,

            ...transformManagerSessionCookie,
          },
          body: reqBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body[transformCreatedByViewerId].success).toBe(true);
      await expectReauthorizedTransform(
        transformCreatedByViewerId,
        transformViewerUserApiCredentials,
        apiServices
      );
    }
  );

  // single transform reauthorize_transforms with invalid transformId
  apiTest(
    'should return 200 with error in response if invalid transformId',
    async ({ apiClient, samlAuth }) => {
      const reqBody: ReauthorizeTransformsRequestSchema = [{ id: invalidTransformId }];
      const transformManagerSessionCookie = await samlAuth
        .asTransformManager()
        .then((c) => c.cookieHeader);

      const { statusCode, body } = await apiClient.post(
        'internal/transform/reauthorize_transforms',
        {
          headers: {
            ...COMMON_HEADERS,

            ...transformManagerSessionCookie,
          },
          body: reqBody,
          responseType: 'json',
        }
      );
      expect(statusCode).toBe(200);
      expect(body[invalidTransformId].success).toBe(false);
      expect(body[invalidTransformId].error).toBeDefined();
    }
  );
});
