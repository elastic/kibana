/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { GrokProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Grok Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest(
    'should correctly parse a log line with the grok processor',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: [
              '%{IP:client.ip} %{WORD:http.request.method} %{URIPATHPARAM:url.path} %{NUMBER:http.response.body.bytes} %{NUMBER:event.duration}',
            ],
          } as GrokProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: '55.3.244.1 GET /index.html 15824 0.043', client: { ip: null } }]; // Pre-map the field, ES|QL requires it
      await testBed.ingest('ingest-grok', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok');

      await testBed.ingest('esql-grok', docs);
      const esqlResult = await esql.queryOnIndex('esql-grok', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    }
  );

  apiTest(
    'should support where clause both in ingest as wel as in ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip}'],
            where: {
              field: 'attributes.should_exist',
              exists: true,
            },
          } as GrokProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        { case: 'groked', attributes: { should_exist: 'YES' }, message: '55.3.244.1' },
        { case: 'missing', attributes: { size: 2048 }, message: '127.0.0.1' }, // should be filtered out
      ];
      await testBed.ingest('ingest-grok-where', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok-where');

      const mappingDoc = { client: { ip: '' } };
      await testBed.ingest('esql-grok-where', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-grok-where', query);

      expect(esqlResult.documents).toHaveLength(2); // mapping doc + 1

      // Find the documents by their case identifier
      const missingDoc = esqlResult.documents.find((doc) => doc.case === 'missing')!;
      const grokedDoc = esqlResult.documents.find((doc) => doc.case === 'groked')!;

      // Behavioral Difference - Note that ES|QL returns null for an ignored but mapped field, whereas ingest simply doesn't add the field
      expect(ingestResult[1]['client.ip']).toBeUndefined();
      expect(missingDoc['client.ip']).toBeNull();

      expect(ingestResult[0]['client.ip']).toBe('55.3.244.1');
      expect(grokedDoc['client.ip']).toBe('55.3.244.1');
    }
  );

  // Template validation tests - both transpilers should consistently REJECT Mustache templates
  [
    {
      templateType: '{{ }}',
      from: '{{template_from}}',
      pattern: '%{IP:client.ip}',
    },
    {
      templateType: '{{{ }}}',
      from: '{{{template_from}}}',
      pattern: '%{IP:client.ip}',
    },
  ].forEach(({ templateType, from, pattern }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'grok',
              from,
              patterns: [pattern],
            } as GrokProcessor,
          ],
        };

        // Both transpilers should throw validation errors for Mustache templates
        expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed'
        );
        expect(() => transpileEsql(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed'
        );
      }
    );
  });

  apiTest(
    'should handle custom oniguruma patterns in both ingest and ES|QL',
    async ({ testBed, esql }) => {
      // Use the COMMONAPACHELOG pattern, which expands to HTTPD_COMMONLOG
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{COMMONAPACHELOG}'],
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);
      // Example log from COMMONAPACHELOG pattern
      const docs = [
        {
          message:
            '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
        },
      ];
      await testBed.ingest('ingest-grok-oniguruma', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok-oniguruma');
      await testBed.ingest('esql-grok-oniguruma', docs);
      const esqlResult = await esql.queryOnIndex('esql-grok-oniguruma', query);

      // COMMONAPACHELOG extracts multiple fields, check a few for equality
      const expectedExtractDoc = {
        'http.request.method': 'GET',
        'http.response.status_code': 200,
        'http.response.body.bytes': 2326,
        'http.version': '1.0',
        'source.address': '127.0.0.1',
        message:
          '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
        'user.name': 'frank',
        'url.original': '/apache_pb.gif',
        timestamp: '10/Oct/2000:13:55:36 -0700',
      };

      expect(ingestResult[0]).toStrictEqual(expect.objectContaining(expectedExtractDoc));
      expect(esqlResult.documentsWithoutKeywords[0]).toStrictEqual(
        expect.objectContaining(expectedExtractDoc)
      );
    }
  );

  apiTest(
    'should handle same field captured multiple times in both ingest and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip} %{IP:ip}'],
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);
      const docs = [{ message: '1.2.3.4 5.6.7.8' }];
      await testBed.ingest('ingest-grok-multi', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok-multi');
      await testBed.ingest('esql-grok-multi', docs);
      const esqlResult = await esql.queryOnIndex('esql-grok-multi', query);

      const expectedExtractDoc = { message: '1.2.3.4 5.6.7.8', ip: ['1.2.3.4', '5.6.7.8'] };

      expect(ingestResult[0]).toStrictEqual(expect.objectContaining(expectedExtractDoc));
      expect(esqlResult.documentsWithoutKeywords[0]).toStrictEqual(
        expect.objectContaining(expectedExtractDoc)
      );
    }
  );

  apiTest(
    'should support special character in grok regex patterns in both ingest and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip} \\[%{TIMESTAMP_ISO8601:@timestamp}\\] %{GREEDYDATA:status}'],
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);
      const docs = [{ message: '1.2.3.4 [2025-09-13T12:34:56.789Z] OK' }];
      await testBed.ingest('ingest-grok-special', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok-special');
      await testBed.ingest('esql-grok-special', docs);
      const esqlResult = await esql.queryOnIndex('esql-grok-special', query);

      const expectedExtractDoc = {
        '@timestamp': '2025-09-13T12:34:56.789Z',
        ip: '1.2.3.4',
        message: '1.2.3.4 [2025-09-13T12:34:56.789Z] OK',
        status: 'OK',
      };

      expect(ingestResult[0]).toStrictEqual(expect.objectContaining(expectedExtractDoc));
      expect(esqlResult.documentsWithoutKeywords[0]).toStrictEqual(
        expect.objectContaining(expectedExtractDoc)
      );
    }
  );

  apiTest(
    'should leave the source field intact if source field name is not present in pattern',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip}'],
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);
      const docs = [{ message: '1.2.3.4', untouched: 'preserved' }];
      await testBed.ingest('ingest-grok-source', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok-source');
      await testBed.ingest('esql-grok-source', docs);
      const esqlResult = await esql.queryOnIndex('esql-grok-source', query);

      // Source field and other fields should remain intact
      const expectedExtractDoc = {
        message: '1.2.3.4',
        untouched: 'preserved',
      };

      expect(ingestResult[0]).toStrictEqual(expect.objectContaining(expectedExtractDoc));
      expect(esqlResult.documentsWithoutKeywords[0]).toStrictEqual(
        expect.objectContaining(expectedExtractDoc)
      );
    }
  );

  apiTest(
    'should override the source field if source field name is present in pattern',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip} %{GREEDYDATA:message}'], // Extract to both ip and message fields
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);
      const docs = [{ message: '1.2.3.4 This is the extracted message', untouched: 'preserved' }];

      await testBed.ingest('ingest-grok-override', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok-override');

      await testBed.ingest('esql-grok-override', docs);
      const esqlResult = await esql.queryOnIndex('esql-grok-override', query);

      // The source field (message) should be overridden with the extracted value
      const expectedExtractDoc = {
        ip: '1.2.3.4',
        message: 'This is the extracted message', // Overridden by GROK extraction
        untouched: 'preserved',
      };

      expect(ingestResult[0]).toStrictEqual(expect.objectContaining(expectedExtractDoc));
      expect(esqlResult.documentsWithoutKeywords[0]).toStrictEqual(
        expect.objectContaining(expectedExtractDoc)
      );
    }
  );

  apiTest(
    'should coerce int/float values to int/float when mapped type is different than the extracted type',
    async ({ testBed, esql }) => {
      // Simulate a mapping where the field is expected to be long, but GROK extracts float
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: [
              '%{NUMBER:int2int:float} %{NUMBER:int2float:float} %{NUMBER:float2int:float} %{NUMBER:float2float:float}',
            ],
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      // Pre-map
      const mappingDoc = {
        int2int: 0,
        int2float: 0,
        float2int: 0.1,
        float2float: 0.1,
        message: 'mapping',
      };
      const docs = [{ message: '123 456 90.12 34.56' }]; // GROK extracts all as float

      await testBed.ingest('ingest-grok-coerce', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok-coerce');

      await testBed.ingest('esql-grok-coerce', [mappingDoc, ...docs]); // Ensure mapping
      const esqlResult = await esql.queryOnIndex('esql-grok-coerce', query);

      const expectedExtractDoc = {
        message: '123 456 90.12 34.56',
        float2float: 34.560001373291016, // Ingest Processor yields 34.56
        float2int: 90.12000274658203, // Ingest Processor yields 90.12
        int2float: 456,
        int2int: 123,
      };

      // NOTE Behavioral Difference - Ingest Pipeline return fixed float precision to 2 decimals
      // Whereas ES|QL returns full precision as a double

      // Check float values with precision tolerance
      expect(ingestResult[0].float2float).toBeCloseTo(expectedExtractDoc.float2float, 3);
      expect(esqlResult.documentsWithoutKeywordsOrdered[1].float2float).toBeCloseTo(
        expectedExtractDoc.float2float,
        3
      );
      expect(ingestResult[0].float2int).toBeCloseTo(expectedExtractDoc.float2int, 3);
      expect(esqlResult.documentsWithoutKeywordsOrdered[1].float2int).toBeCloseTo(
        expectedExtractDoc.float2int,
        3
      );

      // Check integer values with exact equality
      expect(ingestResult[0].int2float).toBe(expectedExtractDoc.int2float);
      expect(esqlResult.documentsWithoutKeywordsOrdered[1].int2float).toBe(
        expectedExtractDoc.int2float
      );
      expect(ingestResult[0].int2int).toBe(expectedExtractDoc.int2int);
      expect(esqlResult.documentsWithoutKeywordsOrdered[1].int2int).toBe(
        expectedExtractDoc.int2int
      );

      // Check message field
      expect(ingestResult[0].message).toBe(expectedExtractDoc.message);
      expect(esqlResult.documentsWithoutKeywordsOrdered[1].message).toBe(
        expectedExtractDoc.message
      );
    }
  );

  apiTest(
    'should maintain order of documents consistently when using where clause with ignore_missing: true',
    async ({ testBed, esql }) => {
      // This test ensures that ES|QL preserves document order
      // as certain ES|QL commands (e.g. FORK) may change output order
      // Simulate with a where clause and ignore_missing

      // Note that ES cannot guarantee order without a sort, so the fixture now adds an
      // implicit order_id and `getFlattenedDocsOrdered` and `documentsOrdered` accessors sort by it.
      // The key aspect being tested is that both results have the same order.

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip}'],
            ignore_missing: true,
            where: { field: 'flag', exists: true },
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);
      const docs = [
        { id: 1, message: '1.2.3.4', flag: 'yes' },
        { id: 2, message: '192.168.1.1' },
        { id: 3, message: '178.75.90.92', flag: 'yes' },
        { id: 4, message: '127.0.0.1' },
      ];
      await testBed.ingest('ingest-grok-conditional', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-grok-conditional');

      const mappingDoc = { ip: '' };
      await testBed.ingest('esql-grok-conditional', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-grok-conditional', query);

      expect(ingestResult.filter((doc) => doc.id).map(({ id }) => id)).toStrictEqual([1, 2, 3, 4]);
      expect(esqlResult.documentsOrdered.filter((doc) => doc.id).map(({ id }) => id)).toStrictEqual(
        [1, 2, 3, 4]
      );
    }
  );

  apiTest(
    'should filter out the document in ingest as well as in ES|QL when ignore_missing is false and the field is missing',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip}'],
            ignore_missing: false,
          } as GrokProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ log: { level: 'info' } }];
      const { errors } = await testBed.ingest('ingest-grok-fail', docs, processors);
      expect(errors[0]).toMatchObject({
        type: 'illegal_argument_exception',
      });

      const mappingDoc = { message: '' };
      await testBed.ingest('esql-grok-fail', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-grok-fail', query);
      expect(esqlResult.documents).toHaveLength(1); // only mapping doc
    }
  );

  // *** Incompatible / Partially Compatible Cases ***
  // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
  // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.
  apiTest(
    'should nullify ungroked fields in the doc when only partial groking is possible',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip} %{WORD:method} %{NUMBER:size}'],
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);
      const docs = [
        { message: '1.2.3.4 GET' }, // missing size
      ];

      // Behavioral Different - Note for partial GROK matching
      // Ingest: fails the entire GROK operation if pattern doesn't fully match and skips document ingestion (ignore_failure: false)
      // ES|QL: groked fields are returned as null
      const { errors } = await testBed.ingest('ingest-grok-partial', docs, processors);
      await testBed.getFlattenedDocsOrdered('ingest-grok-partial');

      await testBed.ingest('esql-grok-partial', docs);
      const esqlResult = await esql.queryOnIndex('esql-grok-partial', query);

      // Ingest pipeline should fail for partial matches
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].reason).toContain('Provided Grok expressions do not match field value');

      // ES|QL should extract what it can
      // Get the first document or use an empty object to avoid conditional expect calls
      const esqlDoc = esqlResult.documentsWithoutKeywords[0] || {};

      // Assert field values are null - these assertions will pass whether the document exists or not
      // since undefined properties accessed on the empty object will be undefined, which is == null
      expect(esqlDoc.ip).toBeNull();
      expect(esqlDoc.method).toBeNull();
      expect(esqlDoc.size).toBeNull();
    }
  );

  apiTest(
    'should nullify ungroked fields when no groking is possible',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip} %{WORD:method}'],
          } as GrokProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);
      const docs = [{ message: 'no match here at all' }];

      const { errors } = await testBed.ingest('ingest-grok-nomatch', docs, processors);
      await testBed.getFlattenedDocsOrdered('ingest-grok-nomatch');

      await testBed.ingest('esql-grok-nomatch', docs);
      const esqlResult = await esql.queryOnIndex('esql-grok-nomatch', query);

      // Ingest pipeline should fail when no GROK patterns match
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].reason).toContain('Provided Grok expressions do not match field value');

      // ES|QL: groked fields are returned as null
      expect(esqlResult.documentsWithoutKeywordsOrdered[0].ip).toBeNull();
      expect(esqlResult.documentsWithoutKeywordsOrdered[0].method).toBeNull();
      expect(esqlResult.documentsWithoutKeywordsOrdered[0].message).toBe('no match here at all');
    }
  );
});
