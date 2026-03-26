/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { DissectProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Dissect Processor', () => {
  apiTest(
    'should correctly parse a log line with the dissect processor',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
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
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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

      // commenting out mapping docs whilst testing unmapped fields
      // const mappingDoc = {
      //   '@timestamp': '',
      //   message: '',
      //   log: { level: '' },
      //   host: { name: '' },
      //   client: { ip: '' },
      // };
      const docs = [
        { expect: 'null', log: { level: 'undissected' } }, // Since log.level is an operand field in dissect pattern, but message is missing, it nullifies the field
        {
          expect: 'dissected',
          log: { level: 'undissected' },
          message: '[2025-01-01T00:00:00.000Z] [dissected] 127.0.0.1',
        },
        { expect: 'null', log: { level: 'undissected' }, message: '2025-01-01T00:00:00.000Z]' },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // expect is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: [0] no-message, [1] valid match, [2] bad format.
      expect(esqlResult.documentsOrdered[0]['log.level']).toBeNull(); // no message → dissect skipped
      expect(esqlResult.documentsOrdered[1]['log.level']).toBe('dissected'); // valid → dissected
      expect(esqlResult.documentsOrdered[2]['log.level']).toBeNull(); // bad format → null
    }
  );

  apiTest(
    'should filter the document out when ignore_missing is false',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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

      const docWithMessage = { message: '[2025-01-01T00:00:00.000Z] [info] 192.168.90.9' };
      const docs = [docWithMessage, { log: { level: 'info' } }];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Should have filtered out the doc missing `message` field
      expect(esqlResult.documents).toHaveLength(1); // Only the doc with a valid message
    }
  );

  apiTest(
    'should use append_separator',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
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
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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
      // const mappingDoc = { log: { level: '' } }; // commenting out mapping docs whilst testing unmapped fields
      const docs = [
        { attributes: { should_exist: 'YES' }, message: '[info]' },
        { attributes: { size: 2048 }, message: '[warn]' },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Find documents by their attributes
      // attributes.should_exist is referenced in the WHERE clause so it is a column — .find() works.
      const shouldExistDoc = esqlResult.documents.find(
        (doc) => doc['attributes.should_exist'] === 'YES'
      );
      // attributes.size is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: [1] is the doc with attributes.size.
      const sizeDoc = esqlResult.documentsOrdered[1];

      // Verify the document with should_exist has been properly dissected
      expect(shouldExistDoc).toStrictEqual(
        expect.objectContaining({
          'log.level': 'info',
        })
      );

      // Verify the document without should_exist has not been dissected
      expect(sizeDoc['log.level']).toBeNull();
    }
  );

  // The following test tests field type mismatches and how dissect with clause where handles them.
  // e.g. for a document { log: { severity: 3 } }, a DISSECT pattern like [%{log.severity}]
  // will extract log.severity as a string (DISSECT always outputs keyword/string).
  // In this case if the indexed log.severity if of different type e.g. long/integer, ES|QL will fail with:
  // `verification_exception: Found 1 problem line 1:1: Column [log.severity] has conflicting data types: [LONG] and [KEYWORD]`
  apiTest(
    'should handle field type mismatches gracefully',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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
      await testBed.ingest(indexName, [...docsToDissect, ...docsToSkip], undefined, {
        dynamic: false,
      });
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
    { tag: tags.stateful.classic },
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

      // commenting out mapping docs whilst testing unmapped fields
      // const mappingDoc = {
      //   case: 'mapping',
      //   message: '',
      //   log: { level: '', severity: '' },
      //   client: { ip: '' },
      //   flags: { process: '' },
      // };

      const docs = [
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

      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // case is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: [0] both, [1] no_message, [2] no_where, [3] none.
      const dissectedDoc = esqlResult.documentsOrdered[0];
      const noMessageDoc = esqlResult.documentsOrdered[1];
      const noWhereDoc = esqlResult.documentsOrdered[2];
      const noneDoc = esqlResult.documentsOrdered[3];

      // Test the properly dissected document
      expect(dissectedDoc['log.level']).toBe('info');
      expect(dissectedDoc['client.ip']).toBe('10.1.1.1');

      // Test documents that should be skipped
      expect(noMessageDoc['log.level']).toBeNull();
      expect(noMessageDoc['client.ip']).toBeNull();

      expect(noWhereDoc['log.level']).toBeNull();
      expect(noWhereDoc['client.ip']).toBeNull();

      expect(noneDoc['log.level']).toBeNull();
      expect(noneDoc['client.ip']).toBeNull();
    }
  );

  apiTest(
    'should handle an exhaustive dissect pattern with modifiers and mixed documents',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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

      // commenting out mapping docs whilst testing unmapped fields
      // const mappingDoc = {
      //   '@timestamp': '',
      //   user: { full_name: '' },
      //   client: { ip: '' },
      //   path: '',
      //   message: '',
      //   flags: { process: '' },
      //   elapsed: 0,
      // };

      const docs = [
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

      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // case is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: [0] full, [1] override, [2] skip_missing, [3] skip_where.
      const fullDoc = esqlResult.documentsOrdered[0];
      const overrideDoc = esqlResult.documentsOrdered[1];
      const skipMissingDoc = esqlResult.documentsOrdered[2];
      const skipWhereDoc = esqlResult.documentsOrdered[3];

      // Test the fully matched document
      expect(fullDoc['@timestamp']).toBe('2025-01-01T00:00:00Z');
      expect(fullDoc['user.full_name']).toBe('john doe');
      expect(fullDoc['client.ip']).toBe('10.0.0.1');
      expect(fullDoc.path).toBe('part1 part2');
      expect(fullDoc.elapsed).toBe('9800');

      // Test the document with overridden values
      expect(overrideDoc['@timestamp']).toBe('2025-02-01T00:00:01Z');
      expect(overrideDoc['user.full_name']).toBe('alice alice');
      expect(overrideDoc['client.ip']).toBe('192.168.0.5');
      expect(overrideDoc.path).toBe('segA segB');
      expect(overrideDoc.elapsed).toBe('5500');

      // Test the document that should be skipped due to missing message
      expect(skipMissingDoc['user.full_name']).toBeNull();
      expect(skipMissingDoc['client.ip']).toBeNull();
      expect(skipMissingDoc.path).toBeNull();

      // Test the document that should be skipped due to where condition
      // status is not referenced in the query so ES|QL does not return it as a column.
      expect(skipWhereDoc['user.full_name']).toBeNull();
      expect(skipWhereDoc['client.ip']).toBeNull();
      expect(skipWhereDoc.path).toBeNull();
      expect(skipWhereDoc.elapsed).toBeNull();
    }
  );

  apiTest(
    'should not be able to retain ingested precision if field is mapped as long',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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
      // const mappingDoc = { size: 0, message: '' }; // [UNMAPPED_FIELDS] NOTE: removing this doc changes test semantics —
      // without it, 'size' is unmapped and loaded as keyword, so parseFloat still works but the field type changes
      const docs = [
        { case: 'dissected', size: 1.9, message: '3.14159265358979323846' },
        { case: 'skipped', size: 88.99 },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // case is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: [0] dissected, [1] skipped.
      const dissectedDoc = esqlResult.documentsOrdered[0];
      const skippedDoc = esqlResult.documentsOrdered[1];

      // Test the dissected document
      expect(parseFloat(dissectedDoc.size as string)).toBeCloseTo(3.1415);

      // Test the skipped document
      expect(skippedDoc.size).toBeNull();
    }
  );

  apiTest(
    'should reject Mustache template syntax {{ and {{{',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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
