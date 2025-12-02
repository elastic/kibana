/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { PostTransformsPreviewRequestSchema } from '../../../../server/routes/api_schemas/transforms';
import {
  createTransformRoles,
  createTransformUsers,
  cleanTransformRoles,
  cleanTransformUsers,
} from '../helpers/transform_users';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures/transform_test_fixture';

function getTransformPreviewConfig(): PostTransformsPreviewRequestSchema {
  // Generate config without dest field for preview
  const { dest, ...config } = generateTransformConfig('');
  return config as PostTransformsPreviewRequestSchema;
}

apiTest.describe('/internal/transform/transforms/_preview', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ esArchiver, kbnClient, esClient, transformApi }) => {
    // Set Kibana timezone to UTC
    await transformApi.setKibanaTimeZoneToUTC();

    // Create transform roles and users
    await createTransformRoles(kbnClient);
    await createTransformUsers(kbnClient);

    // Wait for ft_farequote index to exist
    let retries = 30;
    while (retries > 0) {
      try {
        await esClient.indices.get({ index: 'ft_farequote' });
        break;
      } catch {
        retries--;
        if (retries === 0) {
          throw new Error('ft_farequote index was not created after waiting');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  });

  apiTest.afterAll(async ({ kbnClient, transformApi }) => {
    // Clean transform users and roles
    await cleanTransformUsers(kbnClient);
    await cleanTransformRoles(kbnClient);

    // Reset Kibana timezone
    await transformApi.resetKibanaTimeZone();
  });

  apiTest('should return a transform preview', async ({ makeTransformRequest }) => {
    const { statusCode, body } = await makeTransformRequest<any>({
      method: 'post',
      path: 'internal/transform/transforms/_preview',
      role: 'poweruser',
      body: getTransformPreviewConfig(),
    });

    expect(statusCode).toBe(200);

    expect(body.preview).toHaveLength(19);
    expect(typeof body.generated_dest_index).toBe('object');
  });

  apiTest(
    'should return a correct error for transform preview',
    async ({ makeTransformRequest }) => {
      const { statusCode, body } = await makeTransformRequest<any>({
        method: 'post',
        path: 'internal/transform/transforms/_preview',
        role: 'poweruser',
        body: {
          ...getTransformPreviewConfig(),
          pivot: {
            group_by: { airline: { terms: { field: 'airline' } } },
            aggregations: {
              '@timestamp.value_count': { value_countt: { field: '@timestamp' } },
            },
          },
        },
      });

      expect(statusCode).toBe(400);

      expect(body.message).toContain('Unknown aggregation type [value_countt]');
    }
  );

  apiTest('should return 403 for transform view-only user', async ({ makeTransformRequest }) => {
    const { statusCode } = await makeTransformRequest({
      method: 'post',
      path: 'internal/transform/transforms/_preview',
      role: 'viewer',
      body: getTransformPreviewConfig(),
    });

    expect(statusCode).toBe(403);
  });
});
