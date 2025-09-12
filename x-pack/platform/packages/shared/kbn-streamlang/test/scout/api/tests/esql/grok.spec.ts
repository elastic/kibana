/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { GrokProcessor, StreamlangDSL } from '../../../../..';
import { transpile } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Streamlang to ES|QL - Grok Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest(
      'should correctly parse a log line with the grok processor',
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
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);
        expect(esqlResult.documents[0]).toEqual(
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

    streamlangApiTest(
      'should creates a multi-valued column if filed is repeated in a pattern',
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
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);
        expect(esqlResult.documents[0]['client.ip']).toEqual(['8.8.8.8', '4.4.4.4']);
      }
    );

    streamlangApiTest(
      'should produce a column when grok pattern does not match',
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
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);
        expect(esqlResult.documents[0]['client.ip']).toBeUndefined(); // Never ingested or groked
      }
    );

    streamlangApiTest('should grok an alias-only pattern', async ({ testBed, esql }) => {
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
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]).toEqual(
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
          'message.keyword': docs[0].message,
        })
      );
    });

    streamlangApiTest(
      'should ignore missing field when ignore_missing is true',
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
          { expect: '192.168.1.1', log: { level: 'info' }, client: { ip: '192.168.1.1' } }, // Should not grok
          { expect: '127.0.0.1', client: { ip: '192.168.1.1' }, message: 'User IP: 127.0.0.1' }, // Should grok
          { expect: null, client: { ip: '192.168.1.1' }, message: 'User IP: N/A' }, // Should grok
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // Looping over as FORK may change order of documents
        for (const esqlDoc of esqlResult.documents) {
          const expectValue = esqlDoc.expect;
          if (expectValue === null) {
            expect(esqlDoc['client.ip']).toBeNull();
          } else if (expectValue !== undefined) {
            expect(esqlDoc['client.ip']).toEqual(expectValue);
          }
        }
      }
    );

    streamlangApiTest(
      'should fail if field is missing and ignore_missing is false',
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
        await testBed.ingest(indexName, docs);
        await expect(esql.queryOnIndex(indexName, query)).rejects.toThrow();
      }
    );

    streamlangApiTest('should not grok when where is false', async ({ testBed, esql }) => {
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
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Looping over as FORK may change order of documents
      for (const esqlDoc of esqlResult.documents) {
        if (esqlDoc.expect !== undefined) {
          expect(esqlDoc['client.ip']).toEqual(esqlDoc.expect);
        }
      }
    });

    streamlangApiTest(
      'should handle field type mismatches gracefully (pre-existing numeric vs GROK string output)',
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
          // Mapping doc to ensure fields exist
          {
            http: { response: { body: { bytes: 0 } } },
            status: { keyword: '' },
            flags: { process: '' },
            message: '',
          },
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
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // Ensure no verification exception: values should be strings for both branches
        for (const doc of esqlResult.documents.filter((d) => d.case)) {
          if (doc.case === 'grok_numeric') {
            expect(doc['http.response.body.bytes']).toBe('2048'); // String as no :int GROK suffix
            expect(doc['status.keyword']).toBe('SUCCESS');
          } else if (doc.case === 'skip_numeric') {
            expect(doc['http.response.body.bytes']).toBe('1024'); // Not groked but type casted
            expect(doc['status.keyword']).toBe('preexisting');
          }
        }
      }
    );

    streamlangApiTest(
      'should grok only when both ignore_missing and where conditions match (fork logic)',
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
          // Mapping doc for pre-cast stability
          {
            user: { name: '' },
            client: { ip: '' },
            flags: { process: '' },
            message: '',
          },
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
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        for (const doc of esqlResult.documents.filter((d) => d.case)) {
          switch (doc.case) {
            case 'both':
              expect(doc['user.name']).toBe('alice');
              expect(doc['client.ip']).toBe('10.0.0.1');
              break;
            case 'no_message':
              // Original user.name cast to string; client.ip stays '' or undefined
              expect(doc['user.name']).toBe('legacy');
              expect(doc['client.ip']).toBeNull();
              break;
            case 'no_where':
              // Grok skipped due to where; fields stay original (cast to string) or undefined
              expect(doc['user.name']).toBeNull();
              expect(doc['client.ip']).toBeNull();
              break;
            case 'none':
              expect(doc['user.name']).toBe('offline');
              expect(doc['client.ip']).toBeNull();
              break;
          }
        }
      }
    );

    streamlangApiTest(
      'should handle exhaustive pattern with mixed overrides, intact values, typed fields, and skip branches without type conflicts',
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
          // Mapping / schema stabilization doc
          {
            client: { ip: '0.0.0.0' },
            user: { name: 'baseline' },
            http: { response: { body: { bytes: 0 } } },
            event: { duration: 0 }, // mapped type is long
            'http.response': { status: 'INIT' },
            flags: { process: '' },
            message: '',
          },
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
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // Collect only docs with a case label (exclude mapping doc)
        const resultDocs = esqlResult.documents.filter((d) => d.case);
        expect(resultDocs.length).toBe(4);

        for (const doc of resultDocs) {
          switch (doc.case) {
            case 'grok_all': {
              // Overridden values from GROK
              expect(doc['client.ip']).toBe('10.1.2.3');
              expect(typeof doc['client.ip']).toBe('string');
              expect(doc['user.name']).toBe('alice');
              expect(doc['http.response.body.bytes']).toBe(9876); // int due to :int
              expect(typeof doc['http.response.body.bytes']).toBe('number');
              expect(doc['http.response.status']).toBe('OK');

              expect(doc['event.duration']).toBeCloseTo(4.56); // float due to :float
              break;
            }
            case 'skip_where': {
              // Not grokked: original values should remain (after numeric casts)
              expect(doc['client.ip']).toBe('1.1.1.1'); // IP unchanged (string)
              expect(doc['user.name']).toBe('bob'); // user.name unchanged
              // bytes: original numeric 123 -> pre-cast TO_INTEGER -> 123
              expect(doc['http.response.body.bytes']).toBe(123);
              expect(doc['http.response.status']).toBe('UNCHANGED');

              // duration: original float 7.89 -> ES|QL reads as 7 because the mapped type is long -> pre-cast TO_DOUBLE 7 -> 7
              expect(doc['event.duration']).toBeCloseTo(7.0);
              break;
            }
            case 'skip_missing': {
              // Missing `message`, where passes; fields intact & typed
              expect(doc['client.ip']).toBe('2.2.2.2');
              expect(doc['user.name']).toBe('carol');
              expect(doc['http.response.body.bytes']).toBe(456);
              expect(doc['http.response.status']).toBe('LEGACY');

              // ES|QL reads a long mapped field as integer 3 -> pre-cast TO_DOUBLE -> 3
              expect(doc['event.duration']).toBeCloseTo(3.0);
              break;
            }
            case 'skip_both': {
              // Neither `where` nor `message`; still skip; ensure coercions succeeded
              expect(typeof doc['client.ip']).toBe('string'); // IP numeric originally -> pre-cast string -> remains string (not typed field)
              expect(doc['user.name']).toBe('dave'); // user.name intact
              expect(doc['http.response.body.bytes']).toBe(789); // bytes numeric 789 -> remains numeric after casts
              expect(doc['http.response.status']).toBe('NOOP');

              // duration string '6.28', ES|QL reads as 6 because mapped type is long -> pre-cast TO_DOUBLE -> 6
              expect(doc['event.duration']).toBeCloseTo(6.0);
              break;
            }
          }
        }
      }
    );

    streamlangApiTest(
      'should not be able to retain ingested precision if field is mapped as long',
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
        const mappingDoc = { size: 0, message: '' }; // Ingest size as long type
        const docs = [
          mappingDoc,
          { case: 'groked', size: 1.9, message: '3.14159265358979323846' },
          { case: 'skipped', size: 88.99 },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        for (const doc of esqlResult.documents.filter((d) => d.case)) {
          switch (doc.case) {
            case 'groked':
              expect(doc.size).toBeCloseTo(3.1415); // Because groked as float
              break;
            case 'skipped':
              // size: 88.99 is read as 88 by ES|QL because it's mapped as "long" in the index
              // the GROK casts it as double
              expect(doc.size).toEqual(88);
              break;
          }
        }
      }
    );

    streamlangApiTest(
      'should escape (and not parse) template syntax {{ and {{{',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-grok-escape-template';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'grok',
              from: '{{message.field}}',
              patterns: ['%{IP:client.ip} %{NUMBER:bytes.field:int}'],
            } as GrokProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [{ '{{message.field}}': '10.0.0.1 1024' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents[0]).toEqual(
          expect.objectContaining({
            'client.ip': '10.0.0.1',
            'bytes.field': 1024,
          })
        );
      }
    );
  }
);
