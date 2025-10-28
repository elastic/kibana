/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DissectProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Dissect Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest(
    'should correctly parse a log line with the dissect processor',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern:
              '[%{@timestamp}] [%{log.level}] %{client.ip} - - "%{@method} %{url.original} HTTP/%{http.version}" %{http.response.status_code} %{http.response.body.bytes}',
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          message: '[2025-01-01T00:00:00.000Z] [info] 127.0.0.1 - - "GET / HTTP/1.1" 200 123',
        },
      ];
      await testBed.ingest('ingest-dissect', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-dissect');

      await testBed.ingest('esql-dissect', docs);
      const esqlResult = await esql.queryOnIndex('esql-dissect', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    }
  );

  apiTest(
    'should support append_separator in ingest as well as in ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '%{+field1}-%{+field1}',
            append_separator: ',',
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'value1-value2' }];
      await testBed.ingest('ingest-dissect-append', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-dissect-append');

      await testBed.ingest('esql-dissect-append', docs);
      const esqlResult = await esql.queryOnIndex('esql-dissect-append', query);

      expect(ingestResult[0]).toHaveProperty('field1', 'value1,value2');
      expect(esqlResult.documentsWithoutKeywords[0]).toStrictEqual(
        expect.objectContaining({ field1: 'value1,value2' })
      );

      // Both ingest and ES|QL should produce the same result
      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    }
  );

  // Template validation tests - both transpilers should consistently REJECT Mustache templates
  [
    {
      templateType: '{{ }}',
      from: '{{template_from}}',
      pattern: '[%{log.level}]',
    },
    {
      templateType: '{{{ }}}',
      from: '{{{template_from}}}',
      pattern: '[%{log.level}]',
    },
  ].forEach(({ templateType, from, pattern }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'dissect',
              from,
              pattern,
            } as DissectProcessor,
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
    'should leave the source field intact if source field name is not present in pattern',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{@timestamp}] [%{log.level}] %{client.ip} - %{response_message}',
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          message: '[2025-01-01T00:00:00.000Z] [info] 127.0.0.1 - Request processed successfully',
          existing_field: 'preserved',
        },
      ];

      await testBed.ingest('ingest-dissect-source', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-dissect-source');

      // For ES|QL, create mapping document to establish field types
      const mappingDoc = {
        '@timestamp': '',
        message: '',
        log: { level: '' },
        client: { ip: '' },
        response_message: '',
      };
      await testBed.ingest('esql-dissect-source', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-dissect-source', query);

      expect(ingestResult[0]).toHaveProperty('message', docs[0].message);
      expect(esqlResult.documentsWithoutKeywordsOrdered[1]).toHaveProperty(
        'message',
        docs[0].message
      );

      const { order_id: ingestOrderId, ...ingestDoc } = ingestResult[0];
      const { order_id: esqlOrderId, ...esqlDoc } = esqlResult.documentsWithoutKeywordsOrdered[1];
      expect(ingestDoc).toStrictEqual(esqlDoc);
    }
  );

  apiTest(
    'should override the source field if source field name is present in pattern',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '%{client.ip} - %{message}', // Extract to both client.ip and message fields
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          message: '127.0.0.1 - This is the extracted message',
          existing_field: 'preserved',
        },
      ];

      await testBed.ingest('ingest-dissect-override', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-dissect-override');

      // For ES|QL, create mapping document to establish field types
      const mappingDoc = {
        client: { ip: '' },
        message: '',
      };
      await testBed.ingest('esql-dissect-override', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-dissect-override', query);

      // The source field (message) should be overridden with the extracted value
      const expectedExtractDoc = {
        'client.ip': '127.0.0.1',
        message: 'This is the extracted message', // Overridden by dissect extraction
        existing_field: 'preserved',
      };

      expect(ingestResult[0]).toStrictEqual(expect.objectContaining(expectedExtractDoc));
      expect(esqlResult.documentsWithoutKeywordsOrdered[1]).toStrictEqual(
        expect.objectContaining(expectedExtractDoc)
      );
    }
  );

  apiTest(
    'shout not process/output the document when source field is missing and ignore_missing is false',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{@timestamp}] [%{log.level}] %{client.ip}',
            ignore_missing: false,
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ case: 'missing', log: { level: 'info' } }];
      const { errors } = await testBed.ingest('ingest-dissect-fail', docs, processors);
      expect(errors[0].reason).toContain('field [message] not present as part of path [message]');

      const mappingDoc = { message: '' };
      await testBed.ingest('esql-dissect-fail', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-dissect-fail', query);
      expect(esqlResult.documentsWithoutKeywords).toHaveLength(1); // Only the mapping doc
    }
  );

  // *** Incompatible / Partially Compatible Cases ***
  // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
  // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.
  apiTest(
    'should support where clause both in ingest as well as in ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{log.level}]',
            where: {
              field: 'attributes.should_exist',
              exists: true,
            },
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        { case: 'dissected', attributes: { should_exist: 'YES' }, message: '[info]' },
        { case: 'missing', attributes: { size: 2048 }, message: '[warn]' },
      ];
      await testBed.ingest('ingest-dissect-where', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-dissect-where');

      const mappingDoc = { log: { level: '' } };
      await testBed.ingest('esql-dissect-where', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-dissect-where', query);

      // Get specific documents to avoid conditional expect statements
      const missingDoc = esqlResult.documents.find((doc) => doc.case === 'missing');
      const dissectedDoc = esqlResult.documents.find((doc) => doc.case === 'dissected');

      // NOTE: BEHAVIORAL DIFFERENCE - Where clause conditional processing
      // Ingest Pipeline: Doesn't add field when where condition fails
      // ES|QL: Since every operand field has to be pre-mapped, it adds the nullified field

      // Check the document with missing condition - should be undefined in ingest, null in ESQL
      expect(ingestResult[1]['log.level']).toBeUndefined();
      expect(missingDoc?.['log.level']).toBeNull();

      // Check the document with matched condition - should have the extracted value
      expect(ingestResult[0]['log.level']).toBe('info');
      expect(dissectedDoc?.['log.level']).toBe('info');
    }
  );

  apiTest(
    'should handle pattern matching failures differently - ingest throws errors while ES|QL returns null columns for dissected fields',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            // Pattern expects 3 fields but message only has 2 - partial match
            pattern: '[%{log.level}] %{client.ip} %{missing_field}',
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          message: '[info] 127.0.0.1', // Missing the third field expected by pattern
          existing_field: 'should_retain',
        },
      ];

      // NOTE: BEHAVIORAL DIFFERENCE - Pattern matching failure handling
      // Ingest Pipeline: Throws error when pattern doesn't fully match and skips document ingestion (ignore_failure=false)
      // ES|QL: In case of mismatch, set pre-mapped mismatching fields to null, retains non-pattern fields
      const { errors } = await testBed.ingest('ingest-dissect-partial', docs, processors);
      expect(errors[0].reason).toContain('Unable to find match for dissect pattern');

      // For ES|QL, create mapping document to ensure fields exist as null when not matched
      const mappingDoc = { log: { level: '' }, client: { ip: '' }, missing_field: '' };
      await testBed.ingest('esql-dissect-partial', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-dissect-partial', query);

      // ES|QL: Also fails to extract any fields when pattern doesn't fully match
      const esqlDoc = esqlResult.documentsWithoutKeywordsOrdered.find(
        (doc) => doc.existing_field === 'should_retain'
      );

      expect(esqlDoc).toBeDefined();

      expect(esqlDoc!).toMatchObject({
        existing_field: 'should_retain',
        message: '[info] 127.0.0.1',
      });

      // Verify that ES|QL leaves all dissect pattern fields undefined when match fails
      // Note that ES|QL's `drop_null_columns` needs to be false for consistent behavior
      expect(esqlDoc!['log.level']).toBeNull();
      expect(esqlDoc!['client.ip']).toBeNull();
      expect(esqlDoc!.missing_field).toBeNull();
    }
  );

  apiTest(
    'should handle complete pattern mismatches differently - ingest throws errors while ES|QL returns null columns for dissected fields',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            // Pattern expects structured log but message is unstructured - no match
            pattern: '[%{@timestamp}] [%{log.level}] %{client.ip}',
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          message: 'This is an unstructured log message that does not match the pattern',
          'log.level': 'existing_value', // Pre-existing field that should remain
          'client.ip': '192.168.1.1', // Pre-existing field that should remain
          other_field: 'untouched',
        },
      ];

      // NOTE: BEHAVIORAL DIFFERENCE - Complete pattern mismatch handling
      // Ingest Pipeline: Throws error when pattern doesn't match at all and skips document ingestion (ignore_failure=false)
      // ES|QL: In case of mismatch, set pre-mapped mismatching fields to null, retains non-pattern fields
      const { errors } = await testBed.ingest('ingest-dissect-nomatch', docs, processors);
      expect(errors[0].reason).toContain('Unable to find match for dissect pattern');

      // For ES|QL, create mapping document to establish field types
      const mappingDoc = { '@timestamp': '', log: { level: '' }, client: { ip: '' } };
      await testBed.ingest('esql-dissect-nomatch', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-dissect-nomatch', query);

      // ES|QL: nullifies pattern fields that didn't match, preserves non-pattern fields
      const esqlDoc = esqlResult.documentsWithoutKeywords.find(
        (doc) => doc.other_field === 'untouched'
      );
      expect(esqlDoc).toBeDefined();
      expect(esqlDoc!).toMatchObject({
        message: 'This is an unstructured log message that does not match the pattern',
        other_field: 'untouched',
      });

      // Verify that ES|QL leaves all dissect pattern fields undefined when match fails
      // Note that ES|QL's `drop_null_columns` needs to be false for consistent behavior
      expect(esqlDoc!['@timestamp']).toBeNull();
      expect(esqlDoc!['log.level']).toBeNull();
      expect(esqlDoc!['client.ip']).toBeNull();
    }
  );

  apiTest(
    'should handle explicitly null source field values differently between transpilers (ignore_missing=true)',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{log.level}] %{client.ip}',
            ignore_missing: true,
          } as DissectProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          case: 'null_source',
          message: null, // Explicitly null, not missing
          existing_field: 'preserved',
        },
      ];

      await testBed.ingest('ingest-dissect-null', docs, processors);
      await testBed.getFlattenedDocsOrdered('ingest-dissect-null');

      // NOTE: BEHAVIORAL DIFFERENCE - Null source field handling
      // Ingest Pipeline: throws error when source field is explicitly null
      // ES|QL: Treats null values in source consistently with its column-based model
      const mappingDoc = { message: '', log: { level: '' }, client: { ip: '' } };
      await testBed.ingest('esql-dissect-null', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-dissect-null', query);

      const esqlDoc = esqlResult.documentsWithoutKeywords.find((doc) => doc.case === 'null_source');
      expect(esqlDoc).toBeDefined();
      expect(esqlDoc!).toMatchObject({
        case: 'null_source',
        message: null,
        existing_field: 'preserved',
      });
    }
  );
});
