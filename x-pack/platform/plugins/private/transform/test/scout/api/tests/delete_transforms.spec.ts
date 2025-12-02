/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { DeleteTransformsRequestSchema } from '../../../../server/routes/api_schemas/delete_transforms';
import { TRANSFORM_STATE } from '../../../../common/constants';
import {
  createTransformRoles,
  createTransformUsers,
  cleanTransformRoles,
  cleanTransformUsers,
} from '../helpers/transform_users';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures/transform_test_fixture';

apiTest.describe('/internal/transform/delete_transforms', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ kbnClient, transformApi }) => {
    await createTransformRoles(kbnClient);
    await createTransformUsers(kbnClient);
  });

  apiTest.afterAll(async ({ kbnClient, transformApi }) => {
    await transformApi.cleanTransformIndices();
    await cleanTransformUsers(kbnClient);
    await cleanTransformRoles(kbnClient);
    await transformApi.resetKibanaTimeZone();
  });

  apiTest.describe('single transform deletion', () => {
    const transformId = 'transform-test-delete';
    const destinationIndex = generateDestIndex(transformId);

    apiTest.beforeEach(async ({ esClient, transformApi }) => {
      const config = generateTransformConfig(transformId);
      await transformApi.createTransform(transformId, config);
      await esClient.indices.create({ index: destinationIndex });
    });

    apiTest.afterEach(async ({ esClient }) => {
      try {
        await esClient.indices.delete({ index: destinationIndex });
      } catch {}
    });

    apiTest('should delete transform by transformId', async ({ makeTransformRequest }) => {
      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
      };
      const { statusCode, body } = await makeTransformRequest<any>({
        method: 'post',
        path: 'internal/transform/delete_transforms',
        role: 'poweruser',
        body: reqBody,
      });

      expect(statusCode).toBe(200);
      expect(body[transformId].transformDeleted.success).toBe(true);
      expect(body[transformId].destIndexDeleted.success).toBe(false);
      expect(body[transformId].destDataViewDeleted.success).toBe(false);
    });

    apiTest('should return 403 for unauthorized user', async ({ makeTransformRequest }) => {
      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
      };
      const { statusCode } = await makeTransformRequest<any>({
        method: 'post',
        path: 'internal/transform/delete_transforms',
        role: 'viewer',
        body: reqBody,
      });

      expect(statusCode).toBe(403);
    });
  });

  apiTest.describe('single transform deletion with invalid transformId', () => {
    apiTest(
      'should return 200 with error in response if invalid transformId',
      async ({ makeTransformRequest }) => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [{ id: 'invalid_transform_id', state: TRANSFORM_STATE.STOPPED }],
        };
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/delete_transforms',
          role: 'poweruser',
          body: reqBody,
        });

        expect(statusCode).toBe(200);
        expect(body.invalid_transform_id.transformDeleted.success).toBe(false);
        expect(body.invalid_transform_id.transformDeleted.error).toBeDefined();
      }
    );
  });

  apiTest.describe('bulk deletion', () => {
    const transformIds = ['bulk_delete_test_1', 'bulk_delete_test_2'];
    const destinationIndices = transformIds.map(generateDestIndex);

    apiTest.beforeEach(async ({ esClient, transformApi }) => {
      for (let i = 0; i < transformIds.length; i++) {
        const config = generateTransformConfig(transformIds[i]);
        await transformApi.createTransform(transformIds[i], config);
        await esClient.indices.create({ index: destinationIndices[i] });
      }
    });

    apiTest.afterEach(async ({ esClient }) => {
      for (const index of destinationIndices) {
        try {
          await esClient.indices.delete({ index });
        } catch {}
      }
    });

    apiTest(
      'should delete multiple transforms by transformIds',
      async ({ makeTransformRequest }) => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: transformIds.map((id) => ({ id, state: TRANSFORM_STATE.STOPPED })),
        };
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/delete_transforms',
          role: 'poweruser',
          body: reqBody,
        });

        expect(statusCode).toBe(200);
        for (const id of transformIds) {
          expect(body[id].transformDeleted.success).toBe(true);
          expect(body[id].destIndexDeleted.success).toBe(false);
          expect(body[id].destDataViewDeleted.success).toBe(false);
        }
      }
    );

    apiTest(
      'should delete multiple transforms by transformIds, even if one of the transformIds is invalid',
      async ({ makeTransformRequest }) => {
        const invalidTransformId = 'invalid_transform_id';
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [
            ...transformIds.map((id) => ({ id, state: TRANSFORM_STATE.STOPPED })),
            { id: invalidTransformId, state: TRANSFORM_STATE.STOPPED },
          ],
        };
        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'post',
          path: 'internal/transform/delete_transforms',
          role: 'poweruser',
          body: reqBody,
        });

        expect(statusCode).toBe(200);
        for (const id of transformIds) {
          expect(body[id].transformDeleted.success).toBe(true);
        }
        expect(body[invalidTransformId].transformDeleted.success).toBe(false);
        expect(body[invalidTransformId].transformDeleted.error).toBeDefined();
      }
    );
  });

  apiTest.describe('with deleteDestIndex setting', () => {
    const transformId = 'test2';
    const destinationIndex = generateDestIndex(transformId);

    apiTest.beforeAll(async ({ esClient, transformApi }) => {
      const config = generateTransformConfig(transformId);
      await transformApi.createTransform(transformId, config);
      await esClient.indices.create({ index: destinationIndex });
    });

    apiTest.afterAll(async ({ esClient }) => {
      try {
        await esClient.indices.delete({ index: destinationIndex });
      } catch {}
    });

    apiTest('should delete transform and destination index', async ({ makeTransformRequest }) => {
      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
        deleteDestIndex: true,
      };
      const { statusCode, body } = await makeTransformRequest<any>({
        method: 'post',
        path: 'internal/transform/delete_transforms',
        role: 'poweruser',
        body: reqBody,
      });

      expect(statusCode).toBe(200);
      expect(body[transformId].transformDeleted.success).toBe(true);
      expect(body[transformId].destIndexDeleted.success).toBe(true);
      expect(body[transformId].destDataViewDeleted.success).toBe(false);
    });
  });
});
