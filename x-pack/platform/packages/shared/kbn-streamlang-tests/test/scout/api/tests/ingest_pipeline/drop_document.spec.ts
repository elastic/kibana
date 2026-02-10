/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { DropDocumentProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Drop Document Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should drop a document matching where condition', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-drop-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'drop_document',
            where: {
              field: 'environment',
              eq: 'non-production',
            },
          } as DropDocumentProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { environment: 'production', message: 'keep-this' },
        { environment: 'non-production', message: 'drop-this' }, // should drop docs with non-production environments
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.environment).toBe('production');
      expect(source?.message).toBe('keep-this');
    });
  }
);
