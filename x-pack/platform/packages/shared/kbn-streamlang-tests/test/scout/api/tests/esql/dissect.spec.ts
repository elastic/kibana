/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DissectProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { expectDefined } from '../../../utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Dissect Processor', () => {
  apiTest(
    'should correctly parse a log line with the dissect processor',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern:
              '[%{@timestamp}] [%{log.level}] %{client.ip} - - "%{http.request.method} %{url.original} HTTP/%{http.version}" %{http.response.status_code} %{http.response.body.bytes}',
          } as DissectProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        {
          message: '[2025-01-01T00:00:00.000Z] [info] 127.0.0.1 - - "GET / HTTP/1.1" 200 123',
        },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({
          'log.level': 'info',
          'client.ip': '127.0.0.1',
          'http.request.method': 'GET',
          'url.original': '/',
          'http.version': '1.1',
          'http.response.status_code': '200',
          'http.response.body.bytes': '123',
        })
      );
    }
  );

  apiTest(
    'should ignore dissected fields when ignore_missing is true',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-ignore-missing';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{@timestamp}] [%{log.level}] %{client.ip}',
            ignore_missing: true,
          } as DissectProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);

      // Ingest a doc with all operand fields to satisfy ES|QL requirement that any field used in the query must be pre-mapped (available as a column)
      const mappingDoc = {
        '@timestamp': '',
        message: '',
        log: { level: '' },
        host: { name: '' },
        client: { ip: '' },
      };
      const docs = [
        mappingDoc,
        { expect: 'null', log: { level: 'undissected' } }, // Since log.level is an operand field in dissect pattern, but message is missing, it nullifies the field
        {
          expect: 'dissected',
          log: { level: 'undissected' },
          message: '[2025-01-01T00:00:00.000Z] [dissected] 127.0.0.1',
        },
        { expect: 'null', log: { level: 'undissected' }, message: '2025-01-01T00:00:00.000Z]' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Get docs grouped by their expectation
      const nullDocs = esqlResult.documents.filter((d) => d.expect === 'null');
      const dissectedDocs = esqlResult.documents.filter((d) => d.expect === 'dissected');

      // Test null docs have null log.level
      nullDocs.forEach((doc) => {
        expect(doc['log.level']).toBeNull();
      });

      // Test dissected docs have correct log.level
      dissectedDocs.forEach((doc) => {
        expect(doc['log.level']).toBe('dissected');
      });
    }
  );

  apiTest(
    'should filter the document out when ignore_missing is false',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-fail-missing';
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
      const { query } = transpile(streamlangDSL);

      const mappingDoc = { message: '[2025-01-01T00:00:00.000Z] [info] 192.168.90.9' };
      const docs = [mappingDoc, { log: { level: 'info' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Should have filtered out the doc missing `message` field
      expect(esqlResult.documents).toHaveLength(1); // Only the mapping doc
    }
  );

  apiTest(
    'should use append_separator',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-append-separator';
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
      const { query } = transpile(streamlangDSL);
      const docs = [{ message: 'value1-value2' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({
          field1: 'value1,value2',
        })
      );
    }
  );

  apiTest(
    'should not dissect when where is false',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-where-false';
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
      const { query } = transpile(streamlangDSL);
      const mappingDoc = { log: { level: '' } };
      const docs = [
        mappingDoc,
        { attributes: { should_exist: 'YES' }, message: '[info]' },
        { attributes: { size: 2048 }, message: '[warn]' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Find documents by their attributes
      const shouldExistDoc = esqlResult.documents.find(
        (doc) => doc['attributes.should_exist'] === 'YES'
      );
      const sizeDocs = esqlResult.documents.filter((doc) => doc['attributes.size'] === 2048);

      // Verify the document with should_exist has been properly dissected
      expect(shouldExistDoc).toStrictEqual(
        expect.objectContaining({
          'log.level': 'info',
        })
      );

      // Verify documents without should_exist have not been dissected
      sizeDocs.forEach((doc) => {
        expect(doc['log.level']).toBeNull();
      });
    }
  );

  // The following test tests field type mismatches and how dissect with clause where handles them.
  // e.g. for a document { log: { severity: 3 } }, a DISSECT pattern like [%{log.severity}]
  // will extract log.severity as a string (DISSECT always outputs keyword/string).
  // In this case if the indexed log.severity if of different type e.g. long/integer, ES|QL will fail with:
  // `verification_exception: Found 1 problem line 1:1: Column [log.severity] has conflicting data types: [LONG] and [KEYWORD]`
  apiTest(
    'should handle field type mismatches gracefully',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-field-type-mismatch';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{log.level}] [%{log.severity}] [%{log.size}] [%{log.ratio}]',
            where: {
              field: 'attributes.should_exist',
              exists: true,
            },
          } as DissectProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);

      const docsToDissect = [
        { message: '[info] [5] [1024] [50.55]' },
        { message: '[warn] [5] [1024] [50.55]' },
        { message: '[error] [5] [1024] [50.55]' },
        {
          log: { ratio: 50 }, // ingest ratio as number
          message: '[error] [5] [1024] [50.55]',
        },
        { size: 512, message: '[error] [5] [1024] [50.55]' }, // ingest size as number
      ].map((doc) => ({
        attributes: { should_exist: 'YES' },
        ...doc,
      })); // ensure all docs have the dissect where condition true}))

      const docsToSkip = [
        { log: { severity: 3, level: 'invalid' }, message: '[warn] [3] [1024] 34.2' }, // ingest log.severity as number
        { log: { size: '4096' }, message: '[info] [4] [2048] 22.4' }, // ingest size as string
      ];
      await testBed.ingest(indexName, [...docsToDissect, ...docsToSkip]);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Group documents by their log levels
      const infoLevelDocs = esqlResult.documents.filter((doc) => doc['log.level'] === 'info');
      const warnLevelDocs = esqlResult.documents.filter((doc) => doc['log.level'] === 'warn');
      const errorLevelDocs = esqlResult.documents.filter((doc) => doc['log.level'] === 'error');

      // Check all valid log levels are present
      expect(infoLevelDocs.length).toBeGreaterThan(0);
      expect(warnLevelDocs.length).toBeGreaterThan(0);
      expect(errorLevelDocs.length).toBeGreaterThan(0);

      // Check values are of correct types - without conditional expect calls
      // Get all documents with defined log levels that we care about
      const docsWithValidLogLevels = esqlResult.documents.filter(
        (doc) => doc['log.level'] && ['info', 'warn', 'error'].includes(doc['log.level'] as string)
      );

      // Verify all valid log level docs have string type
      docsWithValidLogLevels.forEach((doc) => {
        expect(typeof doc['log.level']).toBe('string');
      });

      // Test severities separately for docs that have them
      const docsWithSeverity = docsWithValidLogLevels.filter((doc) => doc['log.severity'] !== null);
      docsWithSeverity.forEach((doc) => {
        expect(typeof doc['log.severity']).toBe('string');
      });

      // Test sizes separately for docs that have them
      const docsWithSize = docsWithValidLogLevels.filter((doc) => doc['log.size'] !== null);
      docsWithSize.forEach((doc) => {
        expect(typeof doc['log.size']).toBe('string');
      });

      // Test ratios separately for docs that have them
      const docsWithRatio = docsWithValidLogLevels.filter((doc) => doc['log.ratio'] !== null);
      docsWithRatio.forEach((doc) => {
        expect(typeof doc['log.ratio']).toBe('string');
      });

      // Check for specific values
      const allSeverities = esqlResult.documents
        .filter((doc) => doc['log.severity'] !== null)
        .map((doc) => doc['log.severity']);

      expect(allSeverities.every((val) => ['3', '4', '5'].includes(val as string))).toBe(true);

      const allSizes = esqlResult.documents
        .filter((doc) => doc['log.size'] !== null)
        .map((doc) => doc['log.size']);

      expect(allSizes.every((val) => ['1024', '4096'].includes(val as string))).toBe(true);

      const allRatios = esqlResult.documents
        .filter((doc) => doc['log.ratio'] !== null)
        .map((doc) => doc['log.ratio']);

      expect(allRatios.every((val) => val === '50.55')).toBe(true);
    }
  );

  // This test is flaky on Serverless, it's skipped there for now and needs to be investigated.
  apiTest(
    'should dissect only when both ignore_missing and where conditions match',
    { tag: ['@ess'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-ignore-missing-where';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{log.level}] %{client.ip}',
            ignore_missing: true,
            where: {
              field: 'flags.process',
              exists: true,
            },
          } as DissectProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);

      // Mapping doc to ensure columns exist so pre-cast EVALs don't error
      const mappingDoc = {
        case: 'mapping',
        message: '',
        log: { level: '', severity: '' },
        client: { ip: '' },
        flags: { process: '' },
      };

      const docs = [
        mappingDoc,
        // Both conditions true -> dissect applies
        {
          case: 'both',
          flags: { process: 'Y' },
          message: '[info] 10.1.1.1',
        },
        // ignore_missing triggers skip (message missing) even though where passes
        {
          case: 'no_message',
          flags: { process: 'Y' },
          log: { level: 5 },
        },
        // where fails (no flags.process) even though message present
        {
          case: 'no_where',
          message: '[warn] 10.1.1.2',
          log: { level: 'orig' },
        },
        // Neither condition
        {
          case: 'none',
          log: { level: 'other' },
        },
      ];

      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Find specific documents by their case
      const dissectedDoc = esqlResult.documents.find((d) => d.case === 'both');
      const noMessageDoc = esqlResult.documents.find((d) => d.case === 'no_message');
      const noWhereDoc = esqlResult.documents.find((d) => d.case === 'no_where');
      const noneDoc = esqlResult.documents.find((d) => d.case === 'none');

      // Test the properly dissected document
      expectDefined(dissectedDoc);
      expect(dissectedDoc['log.level']).toBe('info');
      expect(dissectedDoc['client.ip']).toBe('10.1.1.1');

      // Test documents that should be skipped
      expectDefined(noMessageDoc);
      expect(noMessageDoc['log.level']).toBeNull();
      expect(noMessageDoc['client.ip']).toBeNull();

      expectDefined(noWhereDoc);
      expect(noWhereDoc['log.level']).toBeNull();
      expect(noWhereDoc['client.ip']).toBeNull();

      expectDefined(noneDoc);
      expect(noneDoc['log.level']).toBeNull();
      expect(noneDoc['client.ip']).toBeNull();
    }
  );

  apiTest(
    'should handle an exhaustive dissect pattern with modifiers and mixed documents',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-exhaustive';
      const pattern =
        '%{?skip1} [%{@timestamp}] %{->} %{+user.full_name/2}-%{+user.full_name/1} %{client.ip} %{?skip2} %{+path/2}/%{+path/1} %{->} %{elapsed}';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern,
            append_separator: ' ',
            ignore_missing: true,
            where: { field: 'flags.process', exists: true },
          } as DissectProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);

      const mappingDoc = {
        '@timestamp': '',
        user: { full_name: '' },
        client: { ip: '' },
        path: '',
        message: '',
        flags: { process: '' },
        elapsed: 0,
      };

      const docs = [
        mappingDoc,
        // Full match; user pieces john & john, path parts part2 & part1
        {
          case: 'full',
          flags: { process: 'Y' },
          message:
            'poll1 [2025-01-01T00:00:00Z]    doe-john 10.0.0.1 UNUSED part2/part1            9800',
        },
        // Existing values that should be overridden by dissect
        {
          case: 'override',
          flags: { process: 'Y' },
          user: { full_name: 'orig' },
          client: { ip: '1.1.1.1' },
          path: 'orig/path',
          elapsed: 0,
          message: 'poll2 [2025-02-01T00:00:01Z]   alice-alice 192.168.0.5 SKIP segB/segA   5500',
        },
        // Missing message (ignore_missing + where true) => skip dissection
        {
          case: 'skip_missing',
          flags: { process: 'Y' },
          user: { full_name: 'keep' },
          client: { ip: '9.9.9.9' },
        },
        // Where condition false -> skip
        {
          case: 'skip_where',
          path: 'should_not_grok',
          elapsed: 4400,
          status: 203,
          message: '[2025-01-01T00:00:02Z]bob-bob 172.16.0.1 IGNORED x2/y2 2300',
        },
      ];

      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Find specific documents by their case
      const fullDoc = esqlResult.documents.find((d) => d.case === 'full');
      const overrideDoc = esqlResult.documents.find((d) => d.case === 'override');
      const skipMissingDoc = esqlResult.documents.find((d) => d.case === 'skip_missing');
      const skipWhereDoc = esqlResult.documents.find((d) => d.case === 'skip_where');

      // Test the fully matched document
      expectDefined(fullDoc);
      expect(fullDoc['@timestamp']).toBe('2025-01-01T00:00:00Z');
      expect(fullDoc['user.full_name']).toBe('john doe');
      expect(fullDoc['client.ip']).toBe('10.0.0.1');
      expect(fullDoc.path).toBe('part1 part2');
      expect(fullDoc.elapsed).toBe('9800');

      // Test the document with overridden values
      expectDefined(overrideDoc);
      expect(overrideDoc['@timestamp']).toBe('2025-02-01T00:00:01Z');
      expect(overrideDoc['user.full_name']).toBe('alice alice');
      expect(overrideDoc['client.ip']).toBe('192.168.0.5');
      expect(overrideDoc.path).toBe('segA segB');
      expect(overrideDoc.elapsed).toBe('5500');

      // Test the document that should be skipped due to missing message
      expectDefined(skipMissingDoc);
      expect(skipMissingDoc['user.full_name']).toBeNull();
      expect(skipMissingDoc['client.ip']).toBeNull();
      expect(skipMissingDoc.path).toBeNull();

      // Test the document that should be skipped due to where condition
      expectDefined(skipWhereDoc);
      expect(skipWhereDoc['user.full_name']).toBeNull();
      expect(skipWhereDoc['client.ip']).toBeNull();
      expect(skipWhereDoc.path).toBeNull();
      expect(skipWhereDoc.elapsed).toBeNull();
      expect(skipWhereDoc.status).toBe(203); // Non operand field remains number
    }
  );

  apiTest(
    'should not be able to retain ingested precision if field is mapped as long',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-precision';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '%{size}',
            ignore_missing: true,
          } as DissectProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const mappingDoc = { size: 0, message: '' }; // Ingest size as long type
      const docs = [
        mappingDoc,
        { case: 'dissected', size: 1.9, message: '3.14159265358979323846' },
        { case: 'skipped', size: 88.99 },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Find specific documents by their case
      const dissectedDoc = esqlResult.documents.find((d) => d.case === 'dissected');
      const skippedDoc = esqlResult.documents.find((d) => d.case === 'skipped');

      // Test the dissected document
      expectDefined(dissectedDoc);
      expect(parseFloat(dissectedDoc.size as string)).toBeCloseTo(3.1415);

      // Test the skipped document
      expectDefined(skippedDoc);
      expect(skippedDoc.size).toBeNull();
    }
  );

  apiTest(
    'should reject Mustache template syntax {{ and {{{',
    { tag: ['@ess', '@svlOblt'] },
    async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: '{{message.field}}',
            pattern: '%{@timestamp} %{client.ip}',
          } as DissectProcessor,
        ],
      };

      // Should throw validation error for Mustache templates
      expect(() => transpile(streamlangDSL)).toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed'
      );
    }
  );
});
