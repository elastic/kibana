/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { StopTransformsRequestSchema } from '../../../../server/routes/api_schemas/stop_transforms';
import { TRANSFORM_STATE } from '../../../../common/constants';
import {
  createTransformRoles,
  createTransformUsers,
  cleanTransformRoles,
  cleanTransformUsers,
} from '../helpers/transform_users';
import { generateTransformConfig } from '../helpers/transform_config';

import { transformApiTest as apiTest } from '../fixtures/transform_test_fixture';

apiTest.describe('/internal/transform/stop_transforms', { tag: tags.ESS_ONLY }, () => {
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

  apiTest.describe('single transform stop', () => {
    const transformId = 'transform-test-stop';

    apiTest.beforeEach(async ({ esClient, kbnClient, transformApi }) => {
      const config = {
        ...generateTransformConfig(transformId),
        settings: {
          docs_per_second: 10,
          max_page_search_size: 10,
        },
        sync: {
          time: { field: '@timestamp' },
        },
      };
      await transformApi.createTransform(transformId, config);
      await esClient.transform.startTransform({ transform_id: transformId });
    });

    apiTest.afterEach(async ({ esClient, kbnClient, transformApi }) => {
      await transformApi.cleanTransformIndices();
    });

    apiTest('should stop the transform by transformId', async ({ makeTransformRequest }) => {
      const reqBody: StopTransformsRequestSchema = [
        { id: transformId, state: TRANSFORM_STATE.STARTED },
      ];
      const { statusCode, body } = await makeTransformRequest<any>({
        method: 'post',
        path: 'internal/transform/stop_transforms',
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
        const reqBody: StopTransformsRequestSchema = [
          { id: transformId, state: TRANSFORM_STATE.STARTED },
        ];
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/stop_transforms',
          role: 'viewer',
          body: reqBody,
        });

        expect(statusCode).toBe(200);

        expect(body[transformId].success).toBe(false);
        expect(typeof body[transformId].error).toBe('object');
      }
    );
  });

  apiTest.describe('bulk stop', () => {
    const transformIds = ['bulk_stop_test_1', 'bulk_stop_test_2'];

    apiTest.beforeEach(async ({ esClient, kbnClient, transformApi }) => {
      for (const id of transformIds) {
        const config = {
          ...generateTransformConfig(id),
          settings: {
            docs_per_second: 10,
            max_page_search_size: 10,
          },
          sync: {
            time: { field: '@timestamp' },
          },
        };
        await transformApi.createTransform(id, config);
        await esClient.transform.startTransform({ transform_id: id });
      }
    });

    apiTest.afterEach(async ({ esClient, kbnClient, transformApi }) => {
      await transformApi.cleanTransformIndices();
    });

    apiTest('should stop multiple transforms by transformIds', async ({ makeTransformRequest }) => {
      const reqBody: StopTransformsRequestSchema = transformIds.map((id) => ({
        id,
        state: TRANSFORM_STATE.STARTED,
      }));
      const { statusCode, body } = await makeTransformRequest<any>({
        method: 'post',
        path: 'internal/transform/stop_transforms',
        role: 'poweruser',
        body: reqBody,
      });

      expect(statusCode).toBe(200);

      for (const id of transformIds) {
        expect(body[id].success).toBe(true);
      }
    });

    apiTest(
      'should stop multiple transforms by transformIds, even if one of the transformIds is invalid',
      async ({ makeTransformRequest }) => {
        const invalidTransformId = 'invalid_transform_id';
        const reqBody: StopTransformsRequestSchema = [
          { id: transformIds[0], state: TRANSFORM_STATE.STARTED },
          { id: invalidTransformId, state: TRANSFORM_STATE.STOPPED },
          { id: transformIds[1], state: TRANSFORM_STATE.STARTED },
        ];
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/stop_transforms',
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
