/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { autoImportApiTest as apiTest, COMMON_API_HEADERS } from '../fixtures';
import {
  EDITS_DATA_STREAM_ID,
  EDITS_INTEGRATION_ID,
  dataStreamsApiBasePath,
} from '../fixtures/api_test_constants';

const SAMPLES_INDEX = '.kibana-automatic-import-samples';
const INGEST_PIPELINE = { processors: [{ json: { field: 'message', target_field: 'scout' } }] };

apiTest.describe(
  'automatic_import data stream edits API (pipeline editor)',
  { tag: tags.stateful.all },
  () => {
    let headers: Record<string, string>;
    const dataStreamPath = `${dataStreamsApiBasePath(
      EDITS_INTEGRATION_ID
    )}/${EDITS_DATA_STREAM_ID}`;

    apiTest.beforeAll(async ({ apiServices, esClient, samlAuth }) => {
      await apiServices.autoImport.createCompletedDataStream({
        integrationId: EDITS_INTEGRATION_ID,
        dataStreamId: EDITS_DATA_STREAM_ID,
        samples: ['{"bytes":"10"}', '{"bytes":"20"}'],
        ingestPipeline: INGEST_PIPELINE,
        fieldMapping: [{ name: 'scout.bytes', type: 'keyword', is_ecs: false }],
      });
      await esClient.indices.refresh({ index: SAMPLES_INDEX });
      const { cookieHeader } = await samlAuth.asAutoImportPipelineEditor();
      headers = { ...COMMON_API_HEADERS, ...cookieHeader };
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.autoImport.cleanupIntegrations([EDITS_INTEGRATION_ID]);
    });

    apiTest(
      'saves a field type change and rejects a save from the replaced version',
      async ({ apiClient }) => {
        const before = await apiClient.get(`${dataStreamPath}/results`, {
          headers,
          responseType: 'json',
        });
        expect(before).toHaveStatusCode(200);
        const openedVersion: string = before.body.version;

        const saved = await apiClient.put(`${dataStreamPath}/edits`, {
          headers,
          body: {
            ingest_pipeline: INGEST_PIPELINE,
            changes: [{ name: 'scout.bytes', type: 'long' }],
            version: openedVersion,
          },
          responseType: 'json',
        });
        expect(saved).toHaveStatusCode(200);
        expect(saved.body.status).toBe('saved');
        expect(saved.body.version).not.toBe(openedVersion);

        const after = await apiClient.get(`${dataStreamPath}/results`, {
          headers,
          responseType: 'json',
        });
        expect(after).toHaveStatusCode(200);
        expect(after.body.field_type_overrides).toMatchObject([
          { name: 'scout.bytes', type: 'long' },
        ]);
        expect(after.body.ingest_pipeline.processors).toMatchObject(
          expect.arrayContaining([
            {
              convert: expect.objectContaining({
                field: 'scout.bytes',
                type: 'long',
                tag: 'automatic_import_field_type:scout.bytes',
              }),
            },
          ])
        );

        const stale = await apiClient.put(`${dataStreamPath}/edits`, {
          headers,
          body: {
            ingest_pipeline: INGEST_PIPELINE,
            changes: [{ name: 'scout.bytes', type: 'double' }],
            version: openedVersion,
          },
          responseType: 'json',
        });
        expect(stale).toHaveStatusCode(409);
      }
    );
  }
);
