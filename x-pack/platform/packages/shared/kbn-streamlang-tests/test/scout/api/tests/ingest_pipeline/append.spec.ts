/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { AppendProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Append Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should append values to a field', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-append';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['new_tag'],
          } as AppendProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ tags: ['existing_tag'] }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.tags).toStrictEqual(['existing_tag', 'new_tag']);
    });

    apiTest('should append values to a non-existent field', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-append-non-existent';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['new_tag'],
          } as AppendProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'a' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.tags).toStrictEqual(['new_tag']);
    });

    apiTest(
      'should not append duplicate values when allow_duplicates is false',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-append-no-duplicates';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'append',
              to: 'tags',
              value: ['existing_tag'],
              allow_duplicates: false,
            } as AppendProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ tags: ['existing_tag'] }]; // Ingest already existing tag
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        expect(ingestedDocs[0]?.tags).toStrictEqual(['existing_tag']);
      }
    );

    apiTest('should append duplicate values when allow_duplicates is true', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-append-duplicates';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['existing_tag'],
            allow_duplicates: true,
          } as AppendProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ tags: ['existing_tag'] }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.tags).toStrictEqual(['existing_tag', 'existing_tag']);
    });

    // Template validation tests - should reject Mustache templates
    [
      {
        templateTo: '{{tags_field}}',
        templateValue: '{{value_field}}',
        description: 'should reject {{ }} template syntax',
      },
      {
        templateTo: '{{{tags_field}}}',
        templateValue: '{{{value_field}}}',
        description: 'should reject {{{ }}} template syntax',
      },
    ].forEach(({ templateTo, templateValue, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'append',
              to: templateTo,
              value: [templateValue],
            } as AppendProcessor,
          ],
        };

        // Should throw validation error for Mustache templates
        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed'
        );
      });
    });
  }
);
