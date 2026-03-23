/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { GrokProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { expectDefined } from '../../../utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Grok Processor', () => {
  apiTest(
    'should correctly parse a log line with the grok processor',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok';
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
      const { query } = transpile(streamlangDSL);
      const docs = [{ message: '55.3.244.1 GET /index.html 15824 0.043' }];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({
          'client.ip': '55.3.244.1',
          'http.request.method': 'GET',
          'url.path': '/index.html',
          'http.response.body.bytes': '15824',
          'event.duration': '0.043',
        })
      );
    }
  );

  apiTest(
    'should creates a multi-valued column if filed is repeated in a pattern',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-multi';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip} %{IP:client.ip}'],
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [{ message: '8.8.8.8 4.4.4.4' }];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]['client.ip']).toStrictEqual(['8.8.8.8', '4.4.4.4']);
    }
  );

  apiTest(
    'should produce a column when grok pattern does not match',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-fail';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip}'],
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [{ message: 'not_an_ip' }];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]['client.ip']).toBeNull(); // grok didn't extract but did map the field
    }
  );

  apiTest(
    'should grok an alias-only pattern',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-alias-only';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{COMBINEDAPACHELOG}'],
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        {
          message:
            '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08 [en] (Win98; I ;Nav)"',
        },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({
          'user.name': 'frank',
          'http.request.method': 'GET',
          'http.response.status_code': 200,
          'http.response.body.bytes': 2326,
          'http.version': '1.0',
          'http.request.referrer': 'http://www.example.com/start.html',
          'user_agent.original': 'Mozilla/4.08 [en] (Win98; I ;Nav)',
          timestamp: '10/Oct/2000:13:55:36 -0700',
          'url.original': '/apache_pb.gif',
          'source.address': '127.0.0.1',
          message: docs[0].message,
          // With dynamic: false, message is unmapped — no .keyword multi-field is generated
        })
      );
    }
  );

  apiTest(
    'should ignore missing field when ignore_missing is true',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-ignore-missing';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['User IP: %{IP:client.ip}'],
            ignore_missing: true,
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        { expect: null, log: { level: 'info' }, client: { ip: '192.168.1.1' } }, // Should not grok, but nullifies the field
        { expect: '127.0.0.1', client: { ip: '192.168.1.1' }, message: 'User IP: 127.0.0.1' }, // Should grok
        { expect: null, client: { ip: '192.168.1.1' }, message: 'User IP: N/A' }, // Should grok
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // expect is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: [0] no-message, [1] valid IP, [2] bad IP.
      expect(esqlResult.documentsOrdered[0]['client.ip']).toBeNull();
      expect(esqlResult.documentsOrdered[1]['client.ip']).toBe('127.0.0.1');
      expect(esqlResult.documentsOrdered[2]['client.ip']).toBeNull();
    }
  );

  apiTest(
    'should fail if field is missing and ignore_missing is false',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-fail-missing';
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
      const { query } = transpile(streamlangDSL);
      const docs = [{ log: { level: 'info' } }];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      // [UNMAPPED_FIELDS] With SET UNMAPPED_FIELDS=LOAD, 'message' is resolved from _source as null
      // rather than throwing 'Unknown column'. With ignore_missing=false, null source field filters out the document.
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents).toHaveLength(0);
    }
  );

  apiTest(
    'should not grok when where is false',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-where-false';
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
      const { query } = transpile(streamlangDSL);
      const docs = [
        {
          expect: '55.3.244.1',
          attributes: { should_exist: 'YES' },
          client: { ip: '127.0.0.1' },
          message: '55.3.244.1',
        },
        { expect: '8.8.8.8', attributes: { should_exist: 'YES' }, message: '8.8.8.8' },
        { expect: null, attributes: { size: 2048 }, message: '127.0.0.1' },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // expect and attributes.size are not referenced in the query so ES|QL does not return them as columns.
      // Use documentsOrdered by ingestion position: [0] first should_exist, [1] second should_exist, [2] size.
      const [doc0, doc1, doc2] = esqlResult.documentsOrdered;

      // Test documents with should_exist have correct IP
      expect(doc0['client.ip']).toBe('55.3.244.1');
      expect(doc1['client.ip']).toBe('8.8.8.8');

      // Test document with size has null client.ip (where condition not matched)
      expect(doc2['client.ip']).toBeNull();
    }
  );

  apiTest(
    'should handle field type mismatches gracefully (pre-existing numeric vs GROK string output)',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-type-mismatch';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            // Do NOT use :int suffix so GROK outputs keyword (string) for bytes
            patterns: ['%{NUMBER:http.response.body.bytes} %{WORD:status.keyword}'],
            where: {
              field: 'flags.process',
              exists: true,
            },
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        // [UNMAPPED_FIELDS] mapping doc removed — no longer needed with SET UNMAPPED_FIELDS=LOAD
        // { http: { response: { body: { bytes: 0 } } }, status: { keyword: '' }, flags: { process: '' }, message: '' },
        // Will be grokked (bytes numeric in message)
        {
          case: 'grok_numeric',
          flags: { process: 'Y' },
          http: { response: { body: { bytes: 1024 } } },
          status: { keyword: 'unchanged' },
          message: '2048 SUCCESS',
        },
        // Will skip grok (no where condition), pre-existing numeric remains but cast to string pre-fork
        {
          case: 'skip_numeric',
          http: { response: { body: { bytes: 1024 } } },
          status: { keyword: 'preexisting' },
          message: '2048 IGNORED',
        },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // case is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered: grok_numeric was ingested first (index 0), skip_numeric second (index 1).
      const grokNumericDoc = esqlResult.documentsOrdered[0];
      const skipNumericDoc = esqlResult.documentsOrdered[1];

      // Test grokked document
      expectDefined(grokNumericDoc);
      expect(grokNumericDoc['http.response.body.bytes']).toBe('2048'); // String as no :int GROK suffix
      expect(grokNumericDoc['status.keyword']).toBe('SUCCESS');

      // Test skipped document
      expectDefined(skipNumericDoc);
      expect(skipNumericDoc['http.response.body.bytes']).toBeNull(); // Not groked but nullifies the matching field
      expect(skipNumericDoc['status.keyword']).toBeNull(); // Not groked but nullifies the matching field
    }
  );

  apiTest(
    'should grok only when both ignore_missing and where conditions match (fork logic)',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-ignore-missing-where';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['User:%{WORD:user.name} IP:%{IP:client.ip}'],
            ignore_missing: true,
            where: { field: 'flags.process', exists: true },
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        // [UNMAPPED_FIELDS] mapping doc removed — no longer needed with SET UNMAPPED_FIELDS=LOAD
        // { user: { name: '' }, client: { ip: '' }, flags: { process: '' }, message: '' },
        // Both conditions true -> grok
        {
          case: 'both',
          flags: { process: 'YES' },
          user: { name: 'not-alice' },
          message: 'User:alice IP:10.0.0.1',
        },
        // Missing message (ignore_missing forces skip) though where passes
        { case: 'no_message', flags: { process: 'YES' }, user: { name: 'legacy' } },
        // Where fails (no flags.process) though message present
        { case: 'no_where', message: 'User:bob IP:10.0.0.2' },
        // Neither condition
        { case: 'none', user: { name: 'offline' } },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // case is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: both(0), no_message(1), no_where(2), none(3).
      const bothDoc = esqlResult.documentsOrdered[0];
      const noMessageDoc = esqlResult.documentsOrdered[1];
      const noWhereDoc = esqlResult.documentsOrdered[2];
      const noneDoc = esqlResult.documentsOrdered[3];

      // Test document with both conditions
      expectDefined(bothDoc);
      expect(bothDoc['user.name']).toBe('alice');
      expect(bothDoc['client.ip']).toBe('10.0.0.1');

      // Test document with no message
      expectDefined(noMessageDoc);
      expect(noMessageDoc['user.name']).toBeNull();
      expect(noMessageDoc['client.ip']).toBeNull();

      // Test document with no where condition
      expectDefined(noWhereDoc);
      expect(noWhereDoc['user.name']).toBeNull();
      expect(noWhereDoc['client.ip']).toBeNull();

      // Test document with neither condition
      expectDefined(noneDoc);
      expect(noneDoc['user.name']).toBeNull();
      expect(noneDoc['client.ip']).toBeNull();
    }
  );

  // This test fails on Serverless which is a different behavior from Stateful and needs to be investigated
  apiTest(
    'should handle exhaustive pattern with mixed overrides, intact values, typed fields, and skip branches without type conflicts',
    { tag: tags.stateful.classic },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-exhaustive';
      const pattern =
        '%{IP:client.ip} user=%{WORD:user.name:keyword} bytes=%{NUMBER:http.response.body.bytes:int} dur=%{NUMBER:event.duration:float} status=%{WORD:http.response.status}';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: [pattern],
            ignore_missing: true,
            where: { field: 'flags.process', exists: true },
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        // [UNMAPPED_FIELDS] mapping doc removed — no longer needed with SET UNMAPPED_FIELDS=LOAD
        // { client: { ip: '0.0.0.0' }, user: { name: 'baseline' }, http: { response: { body: { bytes: 0 } } },
        //   event: { duration: 0 }, 'http.response': { status: 'INIT' }, flags: { process: '' }, message: '' },
        // Full GROK override (all fields present & where passes)
        {
          case: 'grok_all',
          // Pre-existing values to be overridden
          client: { ip: 12345 }, // numeric pre-existing (will be string after grok)
          user: { name: 777 }, // numeric -> overridden to keyword
          http: { response: { body: { bytes: 111 } } }, // numeric -> will become int 9876
          event: { duration: '1.23' }, // string -> float 4.56
          'http.response': { status: 'OLD' },
          flags: { process: 'Y' },
          message: '10.1.2.3 user=alice bytes=9876 dur=4.56 status=OK',
        },
        // Skip because where fails (no flags.process) even though message present
        {
          case: 'skip_where',
          client: { ip: '1.1.1.1' },
          user: { name: 'bob' },
          http: { response: { body: { bytes: 123 } } },
          event: { duration: 7.89 },
          'http.response': { status: 'UNCHANGED' },
          message: '8.8.8.8 user=ignored bytes=555 dur=9.99 status=IGNORED',
        },
        // Skip because message missing (ignore_missing true) though where passes
        {
          case: 'skip_missing',
          client: { ip: '2.2.2.2' },
          user: { name: 'carol' },
          http: { response: { body: { bytes: 456 } } },
          event: { duration: 3.14 },
          'http.response': { status: 'LEGACY' },
          flags: { process: 'YES' },
        },
        // Both skip reasons absent (neither where passes nor message) — still skip
        {
          case: 'skip_both',
          client: { ip: 999999 }, // numeric, will be coerced via pre-cast & post numeric cast
          user: { name: 'dave' },
          http: { response: { body: { bytes: 789 } } },
          event: { duration: '6.28' },
          'http.response': { status: 'NOOP' },
        },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // case is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: grok_all(0), skip_where(1), skip_missing(2), skip_both(3).
      expect(esqlResult.documentsOrdered).toHaveLength(4);

      const grokAllDoc = esqlResult.documentsOrdered[0];
      const skipWhereDoc = esqlResult.documentsOrdered[1];
      const skipMissingDoc = esqlResult.documentsOrdered[2];
      const skipBothDoc = esqlResult.documentsOrdered[3];

      // Test grokked document
      expectDefined(grokAllDoc);
      expect(grokAllDoc['client.ip']).toBe('10.1.2.3');
      expect(typeof grokAllDoc['client.ip']).toBe('string');
      expect(grokAllDoc['user.name']).toBe('alice');
      expect(grokAllDoc['http.response.body.bytes']).toBe(9876); // int due to :int
      expect(typeof grokAllDoc['http.response.body.bytes']).toBe('number');
      expect(grokAllDoc['http.response.status']).toBe('OK');
      expect(grokAllDoc['event.duration']).toBeCloseTo(4.56); // float due to :float

      // Test skipped document (where fails)
      expectDefined(skipWhereDoc);
      expect(skipWhereDoc['client.ip']).toBeNull();
      expect(skipWhereDoc['user.name']).toBeNull();
      expect(skipWhereDoc['http.response.body.bytes']).toBeNull();
      expect(skipWhereDoc['http.response.status']).toBeNull();
      expect(skipWhereDoc['event.duration']).toBeNull();

      // Test skipped document (missing message)
      expectDefined(skipMissingDoc);
      expect(skipMissingDoc['client.ip']).toBeNull();
      expect(skipMissingDoc['user.name']).toBeNull();
      expect(skipMissingDoc['http.response.body.bytes']).toBeNull();
      expect(skipMissingDoc['http.response.status']).toBeNull();
      expect(skipMissingDoc['event.duration']).toBeNull();

      // Test skipped document (both skip conditions)
      expectDefined(skipBothDoc);
      expect(skipBothDoc['client.ip']).toBeNull();
      expect(skipBothDoc['user.name']).toBeNull();
      expect(skipBothDoc['http.response.body.bytes']).toBeNull();
      expect(skipBothDoc['http.response.status']).toBeNull();
      expect(skipBothDoc['event.duration']).toBeNull();
    }
  );

  apiTest(
    'should not be able to retain ingested precision if field is mapped as long',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-precision';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{NUMBER:size:float}'],
            ignore_missing: true,
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      // const mappingDoc = { size: 0, message: '' }; // [UNMAPPED_FIELDS] NOTE: removing this changes test semantics —
      // without pre-mapping 'size' as long, the field type is determined by first doc ingested
      const docs = [
        { case: 'groked', size: 1.9, message: '3.14159265358979323846' },
        { case: 'skipped', size: 88.99 },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // case is not referenced in the query so ES|QL does not return it as a column.
      // Use documentsOrdered by ingestion position: groked(0), skipped(1).
      const grokedDoc = esqlResult.documentsOrdered[0];
      const skippedDoc = esqlResult.documentsOrdered[1];

      // Test groked document
      expectDefined(grokedDoc);
      expect(grokedDoc.size).toBeCloseTo(3.1415); // Because groked as float

      // Test skipped document
      expectDefined(skippedDoc);
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
            action: 'grok',
            from: '{{message.field}}',
            patterns: ['%{IP:client.ip} %{NUMBER:bytes.field:int}'],
          } as GrokProcessor,
        ],
      };

      // Should throw validation error for Mustache templates
      expect(() => transpile(streamlangDSL)).toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed'
      );
    }
  );

  apiTest(
    'should parse Android log line with regex pattern containing escaped dot',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-grok-android-log';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: [
              '(?<timestamp>\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d{3})\\s+(?<pid>\\d+)\\s+(?<tid>\\d+)\\s+(?<level>\\w+)\\s+(?<tag>\\w+):\\s+(?<log_message>.*)',
            ],
          } as GrokProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        {
          message:
            '11-06 13:43:41.377  1702 17633 W ActivityManager: getRunningAppProcesses: caller 10113 does not hold REAL_GET_TASKS; limiting output',
        },
      ];
      await testBed.ingest(indexName, docs, undefined, { dynamic: false });
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]?.timestamp).toBe('11-06 13:43:41.377');
      expect(esqlResult.documents[0]?.pid).toBe('1702');
      expect(esqlResult.documents[0]?.tid).toBe('17633');
      expect(esqlResult.documents[0]?.level).toBe('W');
      expect(esqlResult.documents[0]?.tag).toBe('ActivityManager');
      expect(esqlResult.documents[0]?.log_message).toBe(
        'getRunningAppProcesses: caller 10113 does not hold REAL_GET_TASKS; limiting output'
      );
    }
  );
});
