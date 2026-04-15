/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { asDoc } from '../../fixtures/doc_utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Filter Conditions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // This test is ingest-pipeline only because ESQL's MV_CONTAINS requires exact type matching.
    // Painless handles this gracefully via string-based comparison fallback.
    apiTest('should handle includes filter condition with numeric array', async ({ testBed }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.has_status_200',
            value: 'success',
            where: {
              field: 'attributes.status_codes',
              includes: 200,
            },
          } as SetProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [
        { attributes: { status_codes: [200, 201, 204] } },
        { attributes: { status_codes: [400, 404, 500] } },
        { attributes: { status_codes: [200] } },
        { attributes: { status_codes: [301, 302] } },
      ];

      await testBed.ingest('ingest-includes-numeric', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-includes-numeric');

      // Ingest pipeline results
      expect(asDoc(ingestResult[0])?.attributes).toStrictEqual(
        expect.objectContaining({ status_codes: [200, 201, 204], has_status_200: 'success' })
      );
      expect(asDoc(asDoc(ingestResult[1])?.attributes)?.has_status_200).toBeUndefined();
      expect(asDoc(ingestResult[2])?.attributes).toStrictEqual(
        expect.objectContaining({ status_codes: [200], has_status_200: 'success' })
      );
      expect(asDoc(asDoc(ingestResult[3])?.attributes)?.has_status_200).toBeUndefined();
    });

    apiTest('special chars: should handle backslashes in eq condition', async ({ testBed }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'matched',
            value: 'yes',
            where: {
              field: 'path',
              eq: 'C:\\Program Files\\App',
            },
          } as SetProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [
        { path: 'C:\\Program Files\\App' },
        { path: 'C:/Program Files/App' },
        { path: '/usr/local/app' },
      ];

      await testBed.ingest('ingest-backslash-eq', docs, processors);
      const result = await testBed.getDocsOrdered('ingest-backslash-eq');

      expect(asDoc(result[0])?.matched).toBe('yes');
      expect(asDoc(result[1])?.matched).toBeUndefined();
      expect(asDoc(result[2])?.matched).toBeUndefined();
    });

    apiTest('special chars: should handle double quotes in eq condition', async ({ testBed }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'matched',
            value: 'yes',
            where: {
              field: 'message',
              eq: 'He said "hello"',
            },
          } as SetProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [
        { message: 'He said "hello"' },
        { message: 'He said hello' },
        { message: "He said 'hello'" },
      ];

      await testBed.ingest('ingest-quotes-eq', docs, processors);
      const result = await testBed.getDocsOrdered('ingest-quotes-eq');

      expect(asDoc(result[0])?.matched).toBe('yes');
      expect(asDoc(result[1])?.matched).toBeUndefined();
      expect(asDoc(result[2])?.matched).toBeUndefined();
    });

    apiTest(
      'special chars: should handle mixed special characters in eq condition',
      async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'matched',
              value: 'yes',
              where: {
                field: 'data',
                eq: 'path: "C:\\Users\\test"',
              },
            } as SetProcessor,
          ],
        };

        const { processors } = await transpile(streamlangDSL);

        const docs = [
          { data: 'path: "C:\\Users\\test"' },
          { data: 'path: "C:/Users/test"' },
          { data: 'path: C:\\Users\\test' },
        ];

        await testBed.ingest('ingest-mixed-special-eq', docs, processors);
        const result = await testBed.getDocsOrdered('ingest-mixed-special-eq');

        expect(asDoc(result[0])?.matched).toBe('yes');
        expect(asDoc(result[1])?.matched).toBeUndefined();
        expect(asDoc(result[2])?.matched).toBeUndefined();
      }
    );

    apiTest(
      'special chars: should handle backslashes in contains condition',
      async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'matched',
              value: 'yes',
              where: {
                field: 'path',
                contains: '\\Program Files\\',
              },
            } as SetProcessor,
          ],
        };

        const { processors } = await transpile(streamlangDSL);

        const docs = [
          { path: 'C:\\Program Files\\App\\bin' },
          { path: 'D:\\Program Files\\Other' },
          { path: '/usr/local/bin' },
        ];

        await testBed.ingest('ingest-backslash-contains', docs, processors);
        const result = await testBed.getDocsOrdered('ingest-backslash-contains');

        expect(asDoc(result[0])?.matched).toBe('yes');
        expect(asDoc(result[1])?.matched).toBe('yes');
        expect(asDoc(result[2])?.matched).toBeUndefined();
      }
    );

    apiTest(
      'special chars: should handle backslashes in startsWith condition',
      async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'matched',
              value: 'yes',
              where: {
                field: 'path',
                startsWith: 'C:\\Windows\\',
              },
            } as SetProcessor,
          ],
        };

        const { processors } = await transpile(streamlangDSL);

        const docs = [
          { path: 'C:\\Windows\\System32' },
          { path: 'C:\\Windows\\Temp' },
          { path: 'D:\\Windows\\Temp' },
        ];

        await testBed.ingest('ingest-backslash-startswith', docs, processors);
        const result = await testBed.getDocsOrdered('ingest-backslash-startswith');

        expect(asDoc(result[0])?.matched).toBe('yes');
        expect(asDoc(result[1])?.matched).toBe('yes');
        expect(asDoc(result[2])?.matched).toBeUndefined();
      }
    );

    apiTest(
      'special chars: should handle backslashes in endsWith condition',
      async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'matched',
              value: 'yes',
              where: {
                field: 'path',
                endsWith: '\\bin\\app.exe',
              },
            } as SetProcessor,
          ],
        };

        const { processors } = await transpile(streamlangDSL);

        const docs = [
          { path: 'C:\\Program Files\\bin\\app.exe' },
          { path: 'D:\\Tools\\bin\\app.exe' },
          { path: 'C:\\bin\\other.exe' },
        ];

        await testBed.ingest('ingest-backslash-endswith', docs, processors);
        const result = await testBed.getDocsOrdered('ingest-backslash-endswith');

        expect(asDoc(result[0])?.matched).toBe('yes');
        expect(asDoc(result[1])?.matched).toBe('yes');
        expect(asDoc(result[2])?.matched).toBeUndefined();
      }
    );
  }
);
