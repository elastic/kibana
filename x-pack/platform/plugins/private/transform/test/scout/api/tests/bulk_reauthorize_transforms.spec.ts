/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { CookieHeader, RoleApiCredentials } from '@kbn/scout';
import type { ReauthorizeTransformsRequestSchema } from '../../../../common';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { expectReauthorizedTransform } from '../helpers/transform_assertions';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe(
  '/internal/transform/reauthorize_transforms bulk',
  { tag: tags.stateful.all },
  () => {
    const transformCreatedByViewerId = 'transform-by-viewer';
    const transformCreatedByManagerId = 'transform-by-manager';
    const transformIds = [transformCreatedByViewerId, transformCreatedByManagerId];

    let transformViewerUserApiCredentials: RoleApiCredentials;
    let transformManagerApiCredentials: RoleApiCredentials;
    let transformManagerCookieHeader: CookieHeader;

    function getDestinationIndices() {
      return transformIds.map((id) => generateDestIndex(id));
    }

    apiTest.beforeAll(async ({ samlAuth, requestAuth }) => {
      transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
      transformManagerApiCredentials = await requestAuth.loginAsTransformManager();

      transformManagerCookieHeader = (await samlAuth.asTransformManager()).cookieHeader;
    });

    apiTest.beforeEach(async ({ apiServices }) => {
      // Create transform by viewer user
      const transformCreatedByViewerRequest = {
        ...generateTransformConfig(transformCreatedByViewerId, true),
        transform_id: transformCreatedByViewerId,
        defer_validation: true,
      };

      await apiServices.transform.createTransformWithSecondaryAuth(
        transformCreatedByViewerRequest,
        transformViewerUserApiCredentials.apiKey.encoded
      );

      // Create transform by manager
      const transformCreatedByManagerRequest = {
        ...generateTransformConfig(transformCreatedByManagerId, true),
        transform_id: transformCreatedByManagerId,
        defer_validation: true,
      };

      await apiServices.transform.createTransformWithSecondaryAuth(
        transformCreatedByManagerRequest,
        transformManagerApiCredentials.apiKey.encoded
      );
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
      const destinationIndices = getDestinationIndices();
      for (const destinationIndex of destinationIndices) {
        await apiServices.transform.deleteIndices({ index: destinationIndex });
      }
    });

    apiTest(
      'should reauthorize multiple transforms for transform manager, even if one of the transformIds is invalid',
      async ({ apiClient, apiServices }) => {
        const invalidTransformId = 'invalid_transform_id';

        const reqBody: ReauthorizeTransformsRequestSchema = [
          { id: transformCreatedByViewerId },
          { id: transformCreatedByManagerId },
          { id: invalidTransformId },
        ];

        const { statusCode, body } = await apiClient.post(
          'internal/transform/reauthorize_transforms',
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformManagerCookieHeader,
            },
            body: reqBody,
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(200);

        // Valid transforms should be reauthorized successfully
        expect(body[transformCreatedByViewerId].success).toBe(true);
        expect(body[transformCreatedByManagerId].success).toBe(true);

        // Verify both transforms are now authorized with manager role
        await expectReauthorizedTransform(
          transformCreatedByViewerId,
          transformViewerUserApiCredentials,
          apiServices
        );
        await expectReauthorizedTransform(
          transformCreatedByManagerId,
          transformManagerApiCredentials,
          apiServices
        );

        // Invalid transform should fail
        expect(body[invalidTransformId].success).toBe(false);
        expect(body[invalidTransformId].error).toBeDefined();
      }
    );
  }
);
