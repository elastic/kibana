/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { StreamlangDSL, UriPartsProcessor } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Uri Parts Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should parse a URI into structured parts', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-uri-parts';
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ uri }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];

      expect(source?.parts?.scheme).toBe('http');
      expect(source?.parts?.domain).toBe('www.example.com');
      expect(source?.parts?.port).toBe(80);
      expect(source?.parts?.path).toBe('/foo.gif');
      expect(source?.parts?.extension).toBe('gif');
      expect(source?.parts?.query).toBe('key1=val1&key2=val2');
      expect(source?.parts?.fragment).toBe('fragment');
      expect(source?.parts?.user_info).toBe('myusername:mypassword');
      expect(source?.parts?.username).toBe('myusername');
      expect(source?.parts?.password).toBe('mypassword');

      // keep_original defaults to true in Elasticsearch ingest processor
      expect(source?.parts?.original).toBe(uri);
    });

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-uri-parts-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'uri',
            to: 'parts',
            ignore_missing: true,
          } as UriPartsProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }]; // Missing `uri` field
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.parts).toBeUndefined();
    });

    apiTest('should remove the source field when remove_if_successful is true', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-uri-parts-remove-source';
      const uri = 'https://www.example.com:8080';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'uri',
            to: 'parts',
            remove_if_successful: true,
          } as UriPartsProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ uri }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];

      expect(source?.uri).toBeUndefined();
      expect(source?.parts?.domain).toBe('www.example.com');
      expect(source?.parts?.scheme).toBe('https');
      expect(source?.parts?.port).toBe(8080);
    });
  }
);

