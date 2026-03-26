/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Strict / negative request-body checks for automatic_import_v2 (manager role).
 *
 * Payloads that include a JSON key named "__proto__" are sent as raw JSON strings with an explicit
 * Content-Type. Parsing them into a JavaScript object before `apiClient.send()` can mutate
 * `Object.prototype` in some engines and break serialization.
 *
 * - PUT /integrations uses a Zod `.strict()` schema: unknown top-level keys are rejected (400).
 * - POST .../upload uses `.strict()` as well: unknown top-level keys are rejected (400).
 * - Raw JSON `__proto__` on PUT is sent as a string body only (avoid client-side prototype hazards).
 * - `originalSource.sourceValue` accepts arbitrary non-empty strings (including “odd” extensions /
 *   path-like names); uploads are not gated on file extension.
 *
 * Payload size / abuse guards (see OpenAPI + Zod in `common/model/`): e.g. upload `samples` max
 * 1000 lines; create `dataStreams` max 50; approve `categories` required, min 1 / max 50;
 * PATCH pipeline string max 10MB and object `processors` max 10000 (validated in `data_stream_routes`).
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { autoImportApiTest as apiTest, COMMON_API_HEADERS } from '../fixtures';
import {
  INTEGRATION_API_BASE_PATH,
  dataStreamsApiBasePath,
  scoutApiErrorText,
} from '../fixtures/api_test_constants';

const minimalDataStream = (i: number) => ({
  dataStreamId: `scout-oversize-ds-${i}`,
  title: `Stream ${i}`,
  description: `Description ${i}`,
  inputTypes: [{ name: 'filestream' as const }],
});

const VALIDATION_INTEGRATION_ID = 'scout-input-validation-integration';
const VALIDATION_DS_ID = 'scout-input-validation-ds';

const validPutIntegrationBody = (integrationId: string) => ({
  connectorId: 'test-connector-placeholder',
  integrationId,
  title: 'Scout input validation',
  description: 'Negative and hardening cases',
});

const expectZodBadRequest = (body: unknown): void => {
  const text = scoutApiErrorText(body);
  expect(text.length).toBeGreaterThan(0);
};

apiTest.describe(
  'automatic_import_v2 input validation & abuse sketches (manager)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;
    const dsBasePath = dataStreamsApiBasePath(VALIDATION_INTEGRATION_ID);

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.autoImport.createIntegrationWithDataStream(
        VALIDATION_INTEGRATION_ID,
        'Scout Input Validation Integration',
        VALIDATION_DS_ID,
        'Scout Input Validation DS'
      );
      ({ cookieHeader } = await samlAuth.asAutoImportManager());
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.autoImport.cleanupIntegrations([VALIDATION_INTEGRATION_ID]);
    });

    apiTest(
      'PUT /integrations: rejects unknown top-level key (strict schema)',
      async ({ apiClient }) => {
        const id = 'scout-neg-unknown-key';
        const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            ...validPutIntegrationBody(id),
            attackerControlledExtraField: true,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
        expectZodBadRequest(response.body);
      }
    );

    apiTest(
      'PUT /integrations: rejects prototype-style keys as unrecognized (__proto__)',
      async ({ apiClient }) => {
        const id = 'scout-neg-proto-key';
        const base = validPutIntegrationBody(id);
        const bodyJson = `{"connectorId":${JSON.stringify(
          base.connectorId
        )},"integrationId":${JSON.stringify(base.integrationId)},"title":${JSON.stringify(
          base.title
        )},"description":${JSON.stringify(base.description)},"__proto__":${JSON.stringify({
          polluted: true,
        })}}`;
        const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
          headers: {
            ...COMMON_API_HEADERS,
            ...cookieHeader,
            'Content-Type': 'application/json',
          },
          body: bodyJson,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
        expectZodBadRequest(response.body);
      }
    );

    apiTest(
      'PUT /integrations: rejects nested constructor payload as unknown key (constructor)',
      async ({ apiClient }) => {
        const id = 'scout-neg-ctor-key';
        const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            ...validPutIntegrationBody(id),
            constructor: { prototype: { isAdmin: true } },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
        expectZodBadRequest(response.body);
      }
    );

    apiTest('PUT /integrations: rejects wrong types for required fields', async ({ apiClient }) => {
      const id = 'scout-neg-wrong-types';
      const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          ...validPutIntegrationBody(id),
          title: 12345,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expectZodBadRequest(response.body);
    });

    apiTest(
      'PUT /integrations: rejects empty integrationId (NonEmptyString)',
      async ({ apiClient }) => {
        const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            ...validPutIntegrationBody(''),
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
        expectZodBadRequest(response.body);
      }
    );

    apiTest(
      'POST .../upload: rejects invalid originalSource.sourceType enum',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${dsBasePath}/${VALIDATION_DS_ID}/upload`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            samples: ['{"x":1}'],
            originalSource: { sourceType: 'executable', sourceValue: 'malware.bin' },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
        expectZodBadRequest(response.body);
      }
    );

    apiTest('POST .../upload: rejects empty originalSource.sourceValue', async ({ apiClient }) => {
      const response = await apiClient.post(`${dsBasePath}/${VALIDATION_DS_ID}/upload`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          samples: ['{"x":1}'],
          originalSource: { sourceType: 'file', sourceValue: '' },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expectZodBadRequest(response.body);
    });

    apiTest('POST .../upload: rejects samples when not an array', async ({ apiClient }) => {
      const response = await apiClient.post(`${dsBasePath}/${VALIDATION_DS_ID}/upload`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          samples: '{"not":"array"}',
          originalSource: { sourceType: 'file', sourceValue: 'bad-samples.log' },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expectZodBadRequest(response.body);
    });

    apiTest('POST .../upload: rejects body without originalSource', async ({ apiClient }) => {
      const response = await apiClient.post(`${dsBasePath}/${VALIDATION_DS_ID}/upload`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          samples: ['{"x":1}'],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expectZodBadRequest(response.body);
    });

    apiTest(
      'POST .../upload: accepts odd file extensions / path-like sourceValue (no extension blocklist)',
      async ({ apiClient }) => {
        const oddNames = [
          'report.exe',
          'script.php',
          '..\\..\\windows\\system32\\evtx.log',
          'very-long-' + 'a'.repeat(200) + '.log',
        ];
        for (const sourceValue of oddNames) {
          const response = await apiClient.post(`${dsBasePath}/${VALIDATION_DS_ID}/upload`, {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              samples: ['{"message":"sample"}'],
              originalSource: { sourceType: 'file', sourceValue },
            },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
        }
      }
    );

    apiTest(
      'POST .../upload: rejects unknown top-level keys (strict schema)',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${dsBasePath}/${VALIDATION_DS_ID}/upload`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            samples: ['{"message":"extra-key-stripped"}'],
            originalSource: { sourceType: 'file', sourceValue: 'extras.log' },
            shouldBeIgnoredByZod: true,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
        expectZodBadRequest(response.body);
        expect(scoutApiErrorText(response.body)).toMatch(/unrecognized|Unrecognized/i);
      }
    );

    apiTest('POST .../upload: rejects more than 1000 samples', async ({ apiClient }) => {
      const response = await apiClient.post(`${dsBasePath}/${VALIDATION_DS_ID}/upload`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          samples: Array.from({ length: 1001 }, (_, i) => `{"line":${i}}`),
          originalSource: { sourceType: 'file', sourceValue: 'too-many-samples.log' },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expectZodBadRequest(response.body);
    });

    apiTest('PUT /integrations: rejects more than 50 data streams', async ({ apiClient }) => {
      const integrationId = 'scout-oversized-ds-list';
      const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          connectorId: 'test-connector-placeholder',
          integrationId,
          title: 'Oversized dataStreams',
          description: 'Request body abuse guard',
          dataStreams: Array.from({ length: 51 }, (_, i) => minimalDataStream(i)),
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expectZodBadRequest(response.body);
    });

    apiTest(
      'POST .../approve: rejects body without categories (strict / required)',
      async ({ apiClient }) => {
        const response = await apiClient.post(
          `${INTEGRATION_API_BASE_PATH}/${VALIDATION_INTEGRATION_ID}/approve`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { version: '1.0.0' },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(400);
        expectZodBadRequest(response.body);
      }
    );

    apiTest('POST .../approve: rejects empty categories array', async ({ apiClient }) => {
      const response = await apiClient.post(
        `${INTEGRATION_API_BASE_PATH}/${VALIDATION_INTEGRATION_ID}/approve`,
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: { version: '1.0.0', categories: [] },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(400);
      expectZodBadRequest(response.body);
    });
  }
);
