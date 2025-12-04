/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';

import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from './constants';

apiTest.describe('/internal/transform/reauthorize_transforms', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  let transformViewerUserApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
    // TODO: Implement test setup
    // 2. Set Kibana timezone to UTC
    // 3. Create transform roles and users
    // 4. Create API keys for transform users (TRANSFORM_VIEWER, TRANSFORM_POWERUSER)
    // 5. Store API keys in a map for later use
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    // TODO: Implement cleanup
    // 1. Clear all transform API keys
    // 2. Unload ES archive
    // 3. Reset Kibana timezone
  });

  apiTest.describe('single transform reauthorize_transforms', () => {
    apiTest.beforeEach(async ({ apiClient, kbnClient }) => {
      // TODO: Implement test setup
      // 1. Create transform 'transform-by-transform_viewer' using API key for TRANSFORM_VIEWER
      // 2. Use header: 'es-secondary-authorization': `ApiKey ${encoded_api_key}`
      // 3. Set deferValidation: true
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      // TODO: Implement cleanup
      // 1. Clean transform indices
      // 2. Delete destination index
    });

    apiTest(
      'should not reauthorize transform created by transform_viewer for transform_unauthorized',
      async ({ apiClient, requestAuth }) => {
        // TODO: Implement test for endpoint POST /internal/transform/reauthorize_transforms
        // 1. Get API credentials for TRANSFORM_UNAUTHORIZED
        // 2. POST request with body: [{ id: 'transform-by-transform_viewer' }]
        // 3. Assert response status 200
        // 4. Assert body[transformId].success equals false
        // 5. Assert body[transformId].error is object
        // 6. Verify transform is unauthorized: state='stopped', health.status='red', health.issues[0].type='privileges_check_failed'
      }
    );

    apiTest(
      'should not reauthorize transform created by transform_viewer for transform_viewer',
      async ({ apiClient, requestAuth }) => {
        // TODO: Implement test for endpoint POST /internal/transform/reauthorize_transforms
        // 1. Get API credentials for TRANSFORM_VIEWER
        // 2. POST request with body: [{ id: 'transform-by-transform_viewer' }]
        // 3. Assert response status 200
        // 4. Assert body[transformId].success equals false
        // 5. Assert body[transformId].error is object
        // 6. Verify transform is still unauthorized
      }
    );

    apiTest(
      'should reauthorize transform created by transform_viewer with new api key of poweruser and start the transform',
      async ({ apiClient, requestAuth }) => {
        // TODO: Implement test for endpoint POST /internal/transform/reauthorize_transforms
        // 1. Get API credentials for TRANSFORM_POWERUSER
        // 2. POST request with body: [{ id: 'transform-by-transform_viewer' }]
        // 3. Assert response status 200
        // 4. Assert body[transformId].success equals true
        // 5. Assert body[transformId].error is undefined
        // 6. Wait for transform state to be 'started'
        // 7. Verify transform is authorized: api_key.id is different, health.status='green'
      }
    );
  });

  apiTest.describe('single transform reauthorize_transforms with invalid transformId', () => {
    apiTest(
      'should return 200 with error in response if invalid transformId',
      async ({ apiClient, requestAuth }) => {
        // TODO: Implement test for endpoint POST /internal/transform/reauthorize_transforms
        // 1. Get API credentials for TRANSFORM_POWERUSER
        // 2. POST request with body: [{ id: 'invalid_transform_id' }]
        // 3. Assert response status 200
        // 4. Assert body.invalid_transform_id.success equals false
        // 5. Assert body.invalid_transform_id has property 'error'
      }
    );
  });

  apiTest.describe('bulk reauthorize_transforms', () => {
    apiTest.beforeEach(async ({ apiClient, kbnClient }) => {
      // TODO: Implement test setup
      // 1. Create transform 'transform-by-transform_viewer' using API key for TRANSFORM_VIEWER
      // 2. Create transform 'transform-by-transform_poweruser' using API key for TRANSFORM_POWERUSER
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      // TODO: Implement cleanup
      // 1. Clean transform indices
      // 2. Delete destination indices for both transforms
    });

    apiTest(
      'should reauthorize multiple transforms for transform_poweruser, even if one of the transformIds is invalid',
      async ({ apiClient, requestAuth }) => {
        // TODO: Implement test for endpoint POST /internal/transform/reauthorize_transforms
        // 1. Get API credentials for TRANSFORM_POWERUSER
        // 2. POST request with body including both transforms and 'invalid_transform_id'
        // 3. Assert response status 200
        // 4. Verify 'transform-by-transform_viewer' is authorized
        // 5. Verify 'transform-by-transform_poweruser' is authorized
        // 6. Assert invalid_transform_id.success equals false with error
      }
    );
  });
});
