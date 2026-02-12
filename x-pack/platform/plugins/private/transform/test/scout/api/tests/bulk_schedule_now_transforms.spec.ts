/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { CookieHeader } from '@kbn/scout';
import type {
  ScheduleNowTransformsRequestSchema,
  ScheduleNowTransformsResponseSchema,
} from '../../../../common';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('bulk schedule_now_transforms', { tag: tags.stateful.all }, () => {
  const transformIds = ['bulk_schedule_now_test_1', 'bulk_schedule_now_test_2'];
  let transformManagerCookieHeader: CookieHeader;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asTransformManager();
    transformManagerCookieHeader = credentials.cookieHeader;
  });

  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    for (const id of transformIds) {
      const config = generateTransformConfig(id, true);
      await apiServices.transform.createTransform({ transform_id: id, ...config });
      await esClient.transform.startTransform({ transform_id: id });
    }
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should schedule multiple transforms by transformIds', async ({ apiClient }) => {
    const reqBody: ScheduleNowTransformsRequestSchema = transformIds.map((id) => ({ id }));
    const { statusCode, body } = await apiClient.post(
      'internal/transform/schedule_now_transforms',
      {
        headers: {
          ...COMMON_HEADERS,
          ...transformManagerCookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      }
    );
    const scheduleResponse = body as ScheduleNowTransformsResponseSchema;

    expect(statusCode).toBe(200);
    for (const id of transformIds) {
      expect(scheduleResponse[id].success).toBe(true);
    }
  });

  apiTest(
    'should schedule multiple transforms by transformIds, even if one of the transformIds is invalid',
    async ({ apiClient }) => {
      const invalidTransformId = 'invalid_transform_id';
      const reqBody: ScheduleNowTransformsRequestSchema = [
        { id: transformIds[0] },
        { id: invalidTransformId },
        { id: transformIds[1] },
      ];
      const { statusCode, body } = await apiClient.post(
        'internal/transform/schedule_now_transforms',
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformManagerCookieHeader,
          },
          body: reqBody,
          responseType: 'json',
        }
      );
      const scheduleResponse = body as ScheduleNowTransformsResponseSchema;

      expect(statusCode).toBe(200);
      for (const id of transformIds) {
        expect(scheduleResponse[id].success).toBe(true);
      }
      expect(scheduleResponse[invalidTransformId].success).toBe(false);
      expect(scheduleResponse[invalidTransformId].error).toBeDefined();
    }
  );
});
