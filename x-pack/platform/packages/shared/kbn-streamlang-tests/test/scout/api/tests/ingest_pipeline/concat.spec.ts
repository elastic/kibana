/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { ConcatProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Concat Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should concatenate fields and literals', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-concat-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { from: 'field', value: 'first_name' },
              { from: 'literal', value: '.' },
              { from: 'field', value: 'last_name' },
              { from: 'literal', value: '@' },
              { from: 'field', value: 'email_domain' },
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
      expect(ingestedDocs[0]).toHaveProperty('full_email', 'john.doe@example.com');
    });
  }
);
