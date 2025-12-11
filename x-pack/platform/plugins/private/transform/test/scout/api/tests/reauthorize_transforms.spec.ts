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

  const transformCreatedByViewerId = getTransformIdByUser('transform_viewer');

  function getTransformIdByUser(username: string) {
    return `transform-by-${username}`;
  }

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
    transformUnauthorizedUserApiCredentials = await requestAuth.loginAsTransformUnauthorizedUser();
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.transform.createTransformWithSecondaryAuth(
      transformCreatedByViewerId,
      generateTransformConfig(transformCreatedByViewerId, true),
      transformViewerUserApiCredentials.apiKey.encoded,
      true // deferValidation
    );

    console.log('before each done-----');
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
    await apiServices.transform.deleteIndices(generateDestIndex(transformCreatedByViewerId));
  });

  // single transform reauthorize_transforms
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
      console.log('body', body);

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
});
