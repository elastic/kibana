/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { AppendProcessor, StreamlangDSL } from '../../../../..';
import { transpile } from '../../../../../src/transpilers/ingest_pipeline';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Streamlang to Ingest Pipeline - Append Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest('should append values to a field', async ({ testBed }) => {
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
      expect(ingestedDocs.length).toBe(1);
      expect(ingestedDocs[0]).toHaveProperty('tags', ['existing_tag', 'new_tag']);
    });

    streamlangApiTest('should append values to a non-existent field', async ({ testBed }) => {
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
      expect(ingestedDocs.length).toBe(1);
      expect(ingestedDocs[0]).toHaveProperty('tags', ['new_tag']);
    });

    streamlangApiTest(
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
        expect(ingestedDocs.length).toBe(1);
        expect(ingestedDocs[0]).toHaveProperty('tags', ['existing_tag']);
      }
    );

    streamlangApiTest(
      'should append duplicate values when allow_duplicates is true',
      async ({ testBed }) => {
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
        expect(ingestedDocs.length).toBe(1);
        expect(ingestedDocs[0]).toHaveProperty('tags', ['existing_tag', 'existing_tag']);
      }
    );

    [
      {
        templateTo: '{{tags_field}}',
        templateValue: '{{value_field}}',
        description: 'should append a {{ }} templated value',
      },
      {
        templateTo: '{{tags_field}}',
        templateValue: '{{value_field}}',
        description: 'should append a {{{ ]}} templated value',
      },
    ].forEach(({ templateValue, description }) => {
      streamlangApiTest(description, async ({ testBed }) => {
        const indexName = 'stream-e2e-test-append-templated';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'append',
              to: 'tags',
              value: [templateValue],
            } as AppendProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ tags: ['existing_tag'], tags_field: 'tags', value_field: 'new_tag' }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs.length).toBe(1);
        expect(ingestedDocs[0]).toHaveProperty('tags', ['existing_tag', 'new_tag']);
      });
    });
  }
);
