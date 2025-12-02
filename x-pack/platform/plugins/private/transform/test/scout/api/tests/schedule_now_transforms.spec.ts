/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { ScheduleNowTransformsRequestSchema } from '../../../../server/routes/api_schemas/schedule_now_transforms';
import {
  createTransformRoles,
  createTransformUsers,
  cleanTransformRoles,
  cleanTransformUsers,
} from '../helpers/transform_users';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures/transform_test_fixture';

apiTest.describe('/internal/transform/schedule_now_transforms', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ kbnClient, transformApi }) => {
    await transformApi.setKibanaTimeZoneToUTC();
    await createTransformRoles(kbnClient);
    await createTransformUsers(kbnClient);
  });

  apiTest.afterAll(async ({ kbnClient, transformApi }) => {
    await transformApi.cleanTransformIndices();
    await cleanTransformUsers(kbnClient);
    await cleanTransformRoles(kbnClient);
    await transformApi.resetKibanaTimeZone();
  });

  apiTest.describe('single transform _schedule_now', () => {
    const transformId = 'transform-test-schedule-now';

    apiTest.beforeEach(async ({ esClient, kbnClient, transformApi }) => {
      const config = generateTransformConfig(transformId, true);
      await transformApi.createTransform(transformId, config);
      await esClient.transform.startTransform({ transform_id: transformId });
    });

    apiTest.afterEach(async ({ transformApi }) => {
      await transformApi.cleanTransformIndices();
    });

    apiTest('should schedule the transform by transformId', async ({ makeTransformRequest }) => {
      const reqBody: ScheduleNowTransformsRequestSchema = [{ id: transformId }];
      const { statusCode, body } = await makeTransformRequest<any>({
        method: 'post',
        path: 'internal/transform/schedule_now_transforms',
        role: 'poweruser',
        body: reqBody,
      });

      expect(statusCode).toBe(200);
      expect(body[transformId].success).toBe(true);
      expect(body[transformId].error).toBeUndefined();
    });

    apiTest(
      'should return 200 with success:false for unauthorized user',
      async ({ makeTransformRequest }) => {
        const reqBody: ScheduleNowTransformsRequestSchema = [{ id: transformId }];
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/schedule_now_transforms',
          role: 'viewer',
          body: reqBody,
        });

        expect(statusCode).toBe(200);
        expect(body[transformId].success).toBe(false);
        expect(typeof body[transformId].error).toBe('object');
      }
    );
  });

  apiTest.describe('single transform schedule with invalid transformId', () => {
    apiTest(
      'should return 200 with error in response if invalid transformId',
      async ({ makeTransformRequest }) => {
        const reqBody: ScheduleNowTransformsRequestSchema = [{ id: 'invalid_transform_id' }];
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/schedule_now_transforms',
          role: 'poweruser',
          body: reqBody,
        });

        expect(statusCode).toBe(200);
        expect(body.invalid_transform_id.success).toBe(false);
        expect(body.invalid_transform_id.error).toBeDefined();
      }
    );
  });

  apiTest.describe('bulk schedule', () => {
    const transformIds = ['bulk_schedule_now_test_1', 'bulk_schedule_now_test_2'];

    apiTest.beforeEach(async ({ esClient, kbnClient, transformApi }) => {
      for (const id of transformIds) {
        const config = generateTransformConfig(id, true);
        await transformApi.createTransform(id, config);
        await esClient.transform.startTransform({ transform_id: id });
      }
    });

    apiTest.afterEach(async ({ transformApi }) => {
      await transformApi.cleanTransformIndices();
    });

    apiTest(
      'should schedule multiple transforms by transformIds',
      async ({ makeTransformRequest }) => {
        const reqBody: ScheduleNowTransformsRequestSchema = transformIds.map((id) => ({ id }));
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/schedule_now_transforms',
          role: 'poweruser',
          body: reqBody,
        });

        expect(statusCode).toBe(200);
        for (const id of transformIds) {
          expect(body[id].success).toBe(true);
        }
      }
    );

    apiTest(
      'should schedule multiple transforms by transformIds, even if one of the transformIds is invalid',
      async ({ makeTransformRequest }) => {
        const invalidTransformId = 'invalid_transform_id';
        const reqBody: ScheduleNowTransformsRequestSchema = [
          { id: transformIds[0] },
          { id: invalidTransformId },
          { id: transformIds[1] },
        ];
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/schedule_now_transforms',
          role: 'poweruser',
          body: reqBody,
        });

        expect(statusCode).toBe(200);
        for (const id of transformIds) {
          expect(body[id].success).toBe(true);
        }
        expect(body[invalidTransformId].success).toBe(false);
        expect(body[invalidTransformId].error).toBeDefined();
      }
    );
  });
});
