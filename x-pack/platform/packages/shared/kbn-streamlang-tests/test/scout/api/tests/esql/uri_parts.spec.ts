/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { StreamlangDSL, UriPartsProcessor } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Uri Parts Processor', () => {
  apiTest(
    'should parse a URI into structured parts',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-esql-uri-parts';
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

      const { query } = transpile(streamlangDSL);
      const docs = [{ uri }];
      await testBed.ingest(indexName, docs);

      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents).toHaveLength(1);
      const doc = esqlResult.documents[0];

      expect(doc['parts.scheme']).toBe('http');
      expect(doc['parts.domain']).toBe('www.example.com');
      expect(doc['parts.port']).toBe(80);
      expect(doc['parts.path']).toBe('/foo.gif');
      expect(doc['parts.extension']).toBe('gif');
      expect(doc['parts.query']).toBe('key1=val1&key2=val2');
      expect(doc['parts.fragment']).toBe('fragment');
      expect(doc['parts.user_info']).toBe('myusername:mypassword');
      expect(doc['parts.username']).toBe('myusername');
      expect(doc['parts.password']).toBe('mypassword');

      // keep_original defaults to true in Streamlang and is emulated for ES|QL
      expect(doc['parts.original']).toBe(uri);
    }
  );
});

