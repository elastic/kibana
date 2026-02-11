/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { DropDocumentProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Drop Document Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should drop a document matching where condition', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-drop-basic';

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

      const { query } = transpile(streamlangDSL);

      const docs = [
        { environment: 'production', message: 'keep-this' },
        { environment: 'non-production', message: 'drop-this' }, // should drop docs with non-production environments
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      const source = esqlResult.documents[0];
      expect(source?.environment).toBe('production');
      expect(source?.message).toBe('keep-this');
    });
  }
);
