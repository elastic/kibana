/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { GetTransformNodesResponseSchema } from '../../../../server/routes/api_schemas/transforms';
import {
  createTransformRoles,
  createTransformUsers,
  cleanTransformRoles,
  cleanTransformUsers,
} from '../helpers/transform_users';
import { transformApiTest as apiTest } from '../fixtures/transform_test_fixture';

apiTest.describe('/internal/transform/transforms/_nodes', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ kbnClient }) => {
    // Create transform roles and users
    await createTransformRoles(kbnClient);
    await createTransformUsers(kbnClient);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    // Clean transform users and roles
    await cleanTransformUsers(kbnClient);
    await cleanTransformRoles(kbnClient);
  });

  apiTest(
    'should return the number of available transform nodes for a power user',
    async ({ makeTransformRequest }) => {
      const { statusCode, body } = await makeTransformRequest<GetTransformNodesResponseSchema>({
        method: 'get',
        path: 'internal/transform/transforms/_nodes',
        role: 'poweruser',
      });

      expect(statusCode).toBe(200);

      // At least one node should be available
      expect(body.count).toBeGreaterThanOrEqual(1);
    }
  );

  apiTest(
    'should return the number of available transform nodes for a viewer user',
    async ({ makeTransformRequest }) => {
      const { statusCode, body } = await makeTransformRequest<GetTransformNodesResponseSchema>({
        method: 'get',
        path: 'internal/transform/transforms/_nodes',
        role: 'viewer',
      });

      expect(statusCode).toBe(200);

      // At least one node should be available
      expect(body.count).toBeGreaterThanOrEqual(1);
    }
  );

  apiTest(
    'should not return the number of available transform nodes for an unauthorized user',
    async ({ makeTransformRequest }) => {
      const { statusCode } = await makeTransformRequest({
        method: 'get',
        path: 'internal/transform/transforms/_nodes',
        role: 'unauthorized',
      });

      expect(statusCode).toBe(403);
    }
  );
});
