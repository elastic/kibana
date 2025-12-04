/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import type { ReauthorizeTransformsRequestSchema } from '../../../../server/routes/api_schemas/reauthorize_transforms';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from './constants';

async function expectUnauthorizedTransform(
  transformId: string,
  createdByUserCredentials: RoleApiCredentials,
  apiServices: any
) {
  const transformInfo = await apiServices.transform.getTransform(transformId);
  const expectedApiKeyId = createdByUserCredentials.apiKey.id;

  expect(typeof transformInfo.authorization.api_key).toBe('object');
  expect(transformInfo.authorization.api_key.id).toBe(expectedApiKeyId);

  const stats = await apiServices.transform.getTransformStats(transformId);
  expect(stats.state).toBe(TRANSFORM_STATE.STOPPED);
  expect(stats.health?.status).toBe('red');
  expect(stats.health?.issues![0].type).toBe('privileges_check_failed');
}

async function expectAuthorizedTransform(
  transformId: string,
  createdByUserCredentials: RoleApiCredentials,
  apiServices: any
) {
  const transformInfo = await apiServices.transform.getTransform(transformId);
  const expectedApiKeyId = createdByUserCredentials.apiKey.id;

  expect(transformInfo.authorization.api_key.id).not.toBe(expectedApiKeyId);

  const stats = await apiServices.transform.getTransformStats(transformId);
  expect(stats.health?.status).toBe('green');
}

// If transform was created with sufficient permissions -> should create and start
// If transform was created with insufficient permissions -> should create but not start
apiTest.describe('/internal/transform/reauthorize_transforms', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  let transformViewerUserApiCredentials: RoleApiCredentials;
  let transformUnauthorizedUserApiCredentials: RoleApiCredentials;

  function getTransformIdByUser(username: string) {
    return `transform-by-${username}`;
  }

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
    transformUnauthorizedUserApiCredentials = await requestAuth.loginAsTransformUnauthorizedUser();
  });

  apiTest.describe('single transform reauthorize_transforms', () => {
    const transformCreatedByViewerId = getTransformIdByUser('transform_viewer');

    apiTest.beforeEach(async ({ apiClient }) => {
      await apiClient.put(`internal/transform/transforms/${transformCreatedByViewerId}`, {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        body: generateTransformConfig(transformCreatedByViewerId),
        responseType: 'json',
      });

      /*
      await apiServices.transform.createTransformWithSecondaryAuth(
        transformCreatedByViewerId,
        config,
        transformViewerUserApiCredentials.apiKey.encoded,
        true
      );
      */
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
      await apiServices.transform.deleteIndices(generateDestIndex(transformCreatedByViewerId));
    });

    apiTest(
      'should not reauthorize transform created by transform_viewer for transform_unauthorized',
      async ({ apiClient, apiServices }) => {
        const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];
        const { statusCode, body } = await apiClient.post(
          'internal/transform/reauthorize_transforms',
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformUnauthorizedUserApiCredentials.apiKeyHeader,
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
      'should not reauthorize transform created by transform_viewer for transform_viewer',
      async ({ apiClient, apiServices }) => {
        const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];
        const { statusCode, body } = await apiClient.post(
          'internal/transform/reauthorize_transforms',
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformViewerUserApiCredentials.apiKeyHeader,
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
      'should reauthorize transform created by transform_viewer with new api key of poweruser and start the transform',
      async ({ apiClient, apiServices }) => {
        const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];
        const { statusCode, body } = await apiClient.post(
          'internal/transform/reauthorize_transforms',
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformPowerUserApiCredentials.apiKeyHeader,
            },
            body: reqBody,
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(200);
        expect(body[transformCreatedByViewerId].success).toBe(true);
        expect(typeof body[transformCreatedByViewerId].error).toBe('undefined');

        await apiServices.transform.waitForTransformState(
          transformCreatedByViewerId,
          TRANSFORM_STATE.STARTED
        );

        await expectAuthorizedTransform(
          transformCreatedByViewerId,
          transformViewerUserApiCredentials,
          apiServices
        );
      }
    );
  });

  // single transform reauthorize_transforms with invalid transformId
  apiTest(
    'should return 200 with error in response if invalid transformId',
    async ({ apiClient }) => {
      const reqBody: ReauthorizeTransformsRequestSchema = [{ id: 'invalid_transform_id' }];
      const { statusCode, body } = await apiClient.post(
        'internal/transform/reauthorize_transforms',
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: reqBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.invalid_transform_id.success).toBe(false);
      expect(body.invalid_transform_id.error).toBeDefined();
    }
  );

  apiTest.describe('bulk reauthorize_transforms', () => {
    const transformCreatedByViewerId = getTransformIdByUser('transform_viewer');
    const transformCreatedByPoweruserId = getTransformIdByUser('transform_poweruser');

    apiTest.beforeEach(async ({ apiServices }) => {
      const viewerConfig = generateTransformConfig(transformCreatedByViewerId, true);
      await apiServices.transform.createTransformWithSecondaryAuth(
        transformCreatedByViewerId,
        viewerConfig,
        transformViewerUserApiCredentials.apiKey.encoded,
        true
      );

      const poweruserConfig = generateTransformConfig(transformCreatedByPoweruserId, true);
      await apiServices.transform.createTransformWithSecondaryAuth(
        transformCreatedByPoweruserId,
        poweruserConfig,
        transformPowerUserApiCredentials.apiKey.encoded,
        true
      );
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
      await apiServices.transform.deleteIndices(generateDestIndex(transformCreatedByViewerId));
      await apiServices.transform.deleteIndices(generateDestIndex(transformCreatedByPoweruserId));
    });

    apiTest(
      'should reauthorize multiple transforms for transform_poweruser, even if one of the transformIds is invalid',
      async ({ apiClient, apiServices }) => {
        const invalidTransformId = 'invalid_transform_id';
        const reqBody: ReauthorizeTransformsRequestSchema = [
          { id: transformCreatedByViewerId },
          { id: transformCreatedByPoweruserId },
          { id: invalidTransformId },
        ];

        const { statusCode, body } = await apiClient.post(
          'internal/transform/reauthorize_transforms',
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformPowerUserApiCredentials.apiKeyHeader,
            },
            body: reqBody,
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(200);

        await expectAuthorizedTransform(
          transformCreatedByViewerId,
          transformViewerUserApiCredentials,
          apiServices
        );
        await expectAuthorizedTransform(
          transformCreatedByPoweruserId,
          transformPowerUserApiCredentials,
          apiServices
        );

        expect(body[invalidTransformId].success).toBe(false);
        expect(body[invalidTransformId].error).toBeDefined();
      }
    );
  });
});
