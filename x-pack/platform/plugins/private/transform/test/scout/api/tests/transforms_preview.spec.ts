/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  PostTransformsPreviewRequestSchema,
  PostTransformsPreviewResponseSchema,
} from '../../../../common';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

function getTransformPreviewConfig(): PostTransformsPreviewRequestSchema {
  // passing in an empty string for transform id since we will not use it.
  // We only pick the fields required for the preview request schema.
  const { source, pivot } = generateTransformConfig('');
  return { source, pivot };
}

apiTest.describe('/internal/transform/transforms/_preview', { tag: tags.ESS_ONLY }, () => {
  apiTest('should return a transform preview', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformManager();

    const { statusCode, body } = await apiClient.post('internal/transform/transforms/_preview', {
      headers: {
        ...COMMON_HEADERS,
        ...cookieHeader,
      },
      body: getTransformPreviewConfig(),
      responseType: 'json',
    });
    const previewResponse = body as PostTransformsPreviewResponseSchema;
    expect(statusCode).toBe(200);

    expect(previewResponse.preview).toHaveLength(19);
    expect(typeof previewResponse.generated_dest_index).toBe('object');
  });

  apiTest(
    'should return a correct error for transform preview',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const { statusCode, body } = await apiClient.post('internal/transform/transforms/_preview', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        body: {
          ...getTransformPreviewConfig(),
          pivot: {
            group_by: { airline: { terms: { field: 'airline' } } },
            aggregations: {
              '@timestamp.value_count': { value_countt: { field: '@timestamp' } },
            },
          },
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(400);

      expect(body.message).toContain('Unknown aggregation type [value_countt]');
    }
  );

  apiTest('should return 403 for transform viewer user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformViewer();

    const { statusCode } = await apiClient.post('internal/transform/transforms/_preview', {
      headers: {
        ...COMMON_HEADERS,
        ...cookieHeader,
      },
      body: getTransformPreviewConfig(),
      responseType: 'json',
    });

    expect(statusCode).toBe(403);
  });
});
