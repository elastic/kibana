/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { StreamlangDSL, UriPartsProcessor } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Uri Parts Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should produce consistent outputs in ingest pipelines and ES|QL', async ({ testBed, esql }) => {
      const indexNameIngest = 'ingest-uri-parts';
      const indexNameEsql = 'esql-uri-parts';
      const uri =
        'http://myusername:mypassword@www.example.com:80/foo.gif?key1=val1&key2=val2#fragment';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'uri',
            to: 'parts',
          } as UriPartsProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ uri }];
      await testBed.ingest(indexNameIngest, docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered(indexNameIngest);

      await testBed.ingest(indexNameEsql, docs);
      const esqlResult = await esql.queryOnIndex(indexNameEsql, query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[0]);
    });
  }
);

