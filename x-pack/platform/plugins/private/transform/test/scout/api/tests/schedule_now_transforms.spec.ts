/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  ScheduleNowTransformsRequestSchema,
  ScheduleNowTransformsResponseSchema,
} from '../../../../common';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('/internal/transform/schedule_now_transforms', { tag: tags.stateful.all }, () => {
  const transformId = 'transform-test-schedule-now';

  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    const config = generateTransformConfig(transformId, true);
    await apiServices.transform.createTransform({ transform_id: transformId, ...config });
    await esClient.transform.startTransform({ transform_id: transformId });
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should schedule the transform by transformId', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformManager();

    const reqBody: ScheduleNowTransformsRequestSchema = [{ id: transformId }];
    const { statusCode, body } = await apiClient.post(
      'internal/transform/schedule_now_transforms',
      {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      }
    );
    const scheduleResponse = body as ScheduleNowTransformsResponseSchema;

    expect(statusCode).toBe(200);
    expect(scheduleResponse[transformId].success).toBe(true);
    expect(scheduleResponse[transformId].error).toBeUndefined();
  });

  apiTest(
    'should return 200 with success:false for unauthorized user',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const reqBody: ScheduleNowTransformsRequestSchema = [{ id: transformId }];
      const { statusCode, body } = await apiClient.post(
        'internal/transform/schedule_now_transforms',
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          body: reqBody,
          responseType: 'json',
        }
      );
      const scheduleResponse = body as ScheduleNowTransformsResponseSchema;

      expect(statusCode).toBe(200);
      expect(scheduleResponse[transformId].success).toBe(false);
      expect(typeof scheduleResponse[transformId].error).toBe('object');
    }
  );

  // single transform schedule with invalid transformId
  apiTest(
    'should return 200 with error in response if invalid transformId',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const reqBody: ScheduleNowTransformsRequestSchema = [{ id: 'invalid_transform_id' }];
      const { statusCode, body } = await apiClient.post(
        'internal/transform/schedule_now_transforms',
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          body: reqBody,
          responseType: 'json',
        }
      );
      const scheduleResponse = body as ScheduleNowTransformsResponseSchema;

      expect(statusCode).toBe(200);
      expect(scheduleResponse.invalid_transform_id.success).toBe(false);
      expect(scheduleResponse.invalid_transform_id.error).toBeDefined();
    }
  );
});
