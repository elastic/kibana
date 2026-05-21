/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { streamsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

apiTest.describe('Draft stream simulation', { tag: [...tags.stateful.classic] }, () => {
  const ROOT_STREAM = 'logs.otel';
  const MATERIALIZED_PARENT = 'logs.otel.scout-draft-sim';
  const DRAFT_CHILD = 'logs.otel.scout-draft-sim.draft-child';
  const NESTED_DRAFT = 'logs.otel.scout-draft-sim.draft-child.nested';

  const TEST_TIMESTAMP = '2025-06-01T12:00:00.000Z';

  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.streamsTest.enableDraftStreams();

    for (const name of [NESTED_DRAFT, DRAFT_CHILD, MATERIALIZED_PARENT]) {
      try {
        await apiServices.streamsTest.deleteStream(name);
      } catch {
        // stream may not exist
      }
    }

    await apiServices.streamsTest.forkStream(
      ROOT_STREAM,
      MATERIALIZED_PARENT,
      { field: 'resource.attributes.host.name', eq: 'scout-draft-host' },
      'enabled'
    );

    await apiServices.streamsTest.forkDraftStream(MATERIALIZED_PARENT, DRAFT_CHILD, {
      field: 'severity_text',
      eq: 'error',
    });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    for (const name of [NESTED_DRAFT, DRAFT_CHILD, MATERIALIZED_PARENT]) {
      try {
        await apiServices.streamsTest.deleteStream(name);
      } catch {
        // stream may not exist
      }
    }

    await apiServices.streamsTest.disableDraftStreams();
  });

  apiTest('should simulate a set processor on a draft stream', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      `internal/streams/${DRAFT_CHILD}/processing/_simulate`,
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'set',
                to: 'attributes.enriched',
                value: 'true',
              },
            ],
          },
          documents: [{ '@timestamp': TEST_TIMESTAMP, 'body.text': 'test doc' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].value['attributes.enriched']).toBe('true');
  });

  apiTest('should simulate grok processing on a draft stream', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      `internal/streams/${DRAFT_CHILD}/processing/_simulate`,
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'grok',
                from: 'body.text',
                patterns: [
                  '%{WORD:attributes.method} %{URIPATH:attributes.path} HTTP/%{NUMBER:attributes.http_version}',
                ],
              },
            ],
          },
          documents: [
            {
              '@timestamp': TEST_TIMESTAMP,
              'body.text': 'GET /api/users HTTP/1.1',
            },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].value['attributes.method']).toBe('GET');
    expect(body.documents[0].value['attributes.path']).toBe('/api/users');
    expect(body.documents[0].value['attributes.http_version']).toBe('1.1');
  });

  apiTest(
    'should detect mapping errors for draft stream detected_fields',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        `internal/streams/${DRAFT_CHILD}/processing/_simulate`,
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'set',
                  to: 'attributes.some_field',
                  value: 'not-a-boolean',
                },
              ],
            },
            documents: [
              {
                '@timestamp': TEST_TIMESTAMP,
                'body.text': 'test doc',
              },
            ],
            detected_fields: [{ name: 'attributes.some_field', type: 'boolean' }],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.documents[0].status).toBe('failed');
      const mappingErrors = body.documents[0].errors.filter(
        (e: { type: string }) => e.type === 'field_mapping_failure'
      );
      expect(mappingErrors.length).toBeGreaterThan(0);
    }
  );

  apiTest(
    'should report processor failures correctly on a draft stream',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        `internal/streams/${DRAFT_CHILD}/processing/_simulate`,
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'body.text',
                  patterns: ['%{IP:attributes.ip}'],
                },
              ],
            },
            documents: [{ '@timestamp': TEST_TIMESTAMP, 'body.text': 'no ip here' }],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.documents).toHaveLength(1);
      expect(body.documents[0].status).toBe('failed');
      expect(body.documents_metrics.failed_rate).toBe(1);
    }
  );

  apiTest(
    'should simulate processing on a nested draft (draft child of draft)',
    async ({ apiClient, samlAuth, apiServices }) => {
      await apiServices.streamsTest.forkDraftStream(DRAFT_CHILD, NESTED_DRAFT, {
        field: 'body.text',
        contains: 'critical',
      });

      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        `internal/streams/${NESTED_DRAFT}/processing/_simulate`,
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'set',
                  to: 'attributes.nested_processed',
                  value: 'yes',
                },
              ],
            },
            documents: [{ '@timestamp': TEST_TIMESTAMP, 'body.text': 'critical event' }],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.documents).toHaveLength(1);
      expect(body.documents[0].value['attributes.nested_processed']).toBe('yes');
    }
  );

  apiTest(
    'should simulate multiple sequential processors on a draft stream',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        `internal/streams/${DRAFT_CHILD}/processing/_simulate`,
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'dissect',
                  from: 'body.text',
                  pattern: '%{attributes.ts} %{attributes.level} %{attributes.msg}',
                },
                {
                  action: 'set',
                  to: 'attributes.pipeline',
                  value: 'draft-pipeline',
                },
              ],
            },
            documents: [
              {
                '@timestamp': TEST_TIMESTAMP,
                'body.text': `${TEST_TIMESTAMP} ERROR something`,
              },
            ],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.documents).toHaveLength(1);
      expect(body.documents[0].value['attributes.level']).toBe('ERROR');
      expect(body.documents[0].value['attributes.pipeline']).toBe('draft-pipeline');
    }
  );
});
