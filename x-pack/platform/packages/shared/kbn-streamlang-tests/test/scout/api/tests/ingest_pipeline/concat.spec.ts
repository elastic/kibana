/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { ConcatProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Concat Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should concatenate fields and literals', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-concat-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first_name' },
              { type: 'literal', value: '.' },
              { type: 'field', value: 'last_name' },
              { type: 'literal', value: '@' },
              { type: 'field', value: 'email_domain' },
            ],
            to: 'full_email',
          } as ConcatProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ first_name: 'john', last_name: 'doe', email_domain: 'example.com' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.full_email).toBe('john.doe@example.com');
    });

    apiTest('should concatenate fields and literals with a where clause', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-concat-with-where';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first_name' },
              { type: 'literal', value: '.' },
              { type: 'field', value: 'last_name' },
              { type: 'literal', value: '@' },
              { type: 'field', value: 'email_domain' },
            ],
            where: {
              field: 'has_email',
              eq: true,
            },
            to: 'full_email',
          } as ConcatProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { first_name: 'john', last_name: 'doe', email_domain: 'example.com', has_email: true },
        { first_name: 'jane', last_name: 'smith', email_domain: 'example.com', has_email: false },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);
      expect(ingestedDocs[0]?.full_email).toBe('john.doe@example.com');
      expect(ingestedDocs[1]?.full_email).toBeUndefined();
    });

    apiTest('should concatenate fields and literals with ignore_missing', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-concat-with-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first_name' },
              { type: 'literal', value: '.' },
              { type: 'field', value: 'last_name' },
              { type: 'literal', value: '@' },
              { type: 'field', value: 'email_domain' },
            ],
            ignore_missing: true,
            to: 'full_email',
          } as ConcatProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { first_name: 'john', last_name: 'doe', email_domain: 'example.com' },
        { first_name: 'jane', last_name: 'smith' },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);
      expect(ingestedDocs[0]?.full_email).toBe('john.doe@example.com');
      expect(ingestedDocs[1]?.full_email).toBe('jane.smith@');
    });

    apiTest(
      'should not concatenate fields if ignore_missing is false and some fields are missing',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-concat-with-ignore-missing-false';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'concat',
              from: [
                { type: 'field', value: 'first_name' },
                { type: 'literal', value: '.' },
                { type: 'field', value: 'last_name' },
                { type: 'literal', value: '@' },
                { type: 'field', value: 'email_domain' },
              ],
              ignore_missing: false,
              to: 'full_email',
            } as ConcatProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { first_name: 'john', last_name: 'doe', email_domain: 'example.com' },
          { first_name: 'jane', last_name: 'smith' },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(2);
        expect(ingestedDocs[0]?.full_email).toBe('john.doe@example.com');
        expect(ingestedDocs[1]?.full_email).toBeUndefined();
      }
    );
  }
);
