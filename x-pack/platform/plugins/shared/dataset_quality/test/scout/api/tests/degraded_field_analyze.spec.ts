/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { log, timerange } from '@kbn/synthtrace-client';

import { apiTest, testData } from '../fixtures';
import {
  MORE_THAN_1024_CHARS,
  buildDataStreamName,
  createComponentTemplate,
  createIndexTemplate,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  getWriteBackingIndexName,
  indexLogs,
  logsSynthMappings,
  setDataStreamSettings,
} from '../../common';

const START = '2024-10-02T11:00:00.000Z';
const END = '2024-10-02T11:01:00.000Z';

const DATASET = 'dq.analyze.good';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const COMPONENT_TEMPLATE_NAME = 'logs-dq-analyze@mappings';
const INDEX_TEMPLATE_NAME = 'dq-analyze-index-template';

const SERVICE_NAME = 'my-service';
const HOST_NAME = 'synth-host';

/**
 * Total fields Elasticsearch maps for this data stream: the pinned
 * `logsSynthMappings` template plus what `logs@mappings` and `ecs@mappings`
 * contribute. Parent objects and `.text` multi-fields all count towards
 * `mapping.total_fields.limit`, which is what the endpoint reports.
 */
const EXPECTED_FIELD_COUNT = 28;
const DEFAULT_TOTAL_FIELD_LIMIT = 1000;
const DEFAULT_NESTED_FIELD_LIMIT = 50;

const analyzeUrl = (dataStream: string, field: string, lastBackingIndex: string) =>
  `${testData.API.degradedFieldAnalyze(dataStream, field)}?${new URLSearchParams({
    lastBackingIndex,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - degraded field analyze',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient }) => {
      await createComponentTemplate(esClient, {
        name: COMPONENT_TEMPLATE_NAME,
        mappings: logsSynthMappings(),
      });
      await createIndexTemplate(esClient, {
        name: INDEX_TEMPLATE_NAME,
        indexPatterns: [DATA_STREAM],
        composedOf: [COMPONENT_TEMPLATE_NAME, 'logs@mappings', 'logs@settings', 'ecs@mappings'],
      });

      await indexLogs(logsSynthtraceEsClient, [
        timerange(START, END)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(DATASET)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': SERVICE_NAME,
                'host.name': HOST_NAME,
                test_field: [MORE_THAN_1024_CHARS, 'hello world'],
              })
          ),
      ]);
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, scoutLog);
      await deleteIndexTemplateIfExists(esClient, INDEX_TEMPLATE_NAME, scoutLog);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE_NAME, scoutLog);
      await logsSynthtraceEsClient.clean();
    });

    apiTest(
      'returns default limits and reports isFieldLimitIssue as false',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const lastBackingIndex = await getWriteBackingIndexName(esClient, DATA_STREAM);

        const response = await apiClient.get(
          analyzeUrl(DATA_STREAM, 'test_field', lastBackingIndex),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.isFieldLimitIssue).toBe(false);
        expect(response.body.fieldCount).toBe(EXPECTED_FIELD_COUNT);
        expect(response.body.fieldMapping).toStrictEqual({
          type: 'keyword',
          ignore_above: 1024,
        });
        expect(response.body.totalFieldLimit).toBe(DEFAULT_TOTAL_FIELD_LIMIT);
        expect(response.body.ignoreMalformed).toBe(true);
        expect(response.body.nestedFieldLimit).toBe(DEFAULT_NESTED_FIELD_LIMIT);
      }
    );

    apiTest(
      'returns updated limits and reports isFieldLimitIssue as true',
      async ({ apiClient, esClient, samlAuth, logsSynthtraceEsClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        // Drop the limit to exactly the current field count, then ingest a document
        // carrying a brand new field so that it cannot be mapped.
        await setDataStreamSettings(esClient, DATA_STREAM, {
          'mapping.total_fields.limit': EXPECTED_FIELD_COUNT,
        });
        await indexLogs(logsSynthtraceEsClient, [
          timerange(START, END)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset(DATASET)
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': SERVICE_NAME,
                  'host.name': HOST_NAME,
                  test_field: [MORE_THAN_1024_CHARS, 'hello world'],
                  'cloud.region': 'us-east-1',
                })
            ),
        ]);

        const lastBackingIndex = await getWriteBackingIndexName(esClient, DATA_STREAM);

        const response = await apiClient.get(
          analyzeUrl(DATA_STREAM, 'cloud.region', lastBackingIndex),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.isFieldLimitIssue).toBe(true);
        expect(response.body.fieldCount).toBe(EXPECTED_FIELD_COUNT);
        // The field limit was reached, so the field could not be mapped at all.
        expect(response.body.fieldMapping).toBeUndefined();
        expect(response.body.totalFieldLimit).toBe(EXPECTED_FIELD_COUNT);
        expect(response.body.ignoreMalformed).toBe(true);
        expect(response.body.nestedFieldLimit).toBe(DEFAULT_NESTED_FIELD_LIMIT);
      }
    );
  }
);
