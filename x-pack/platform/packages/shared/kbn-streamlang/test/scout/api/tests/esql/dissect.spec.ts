/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DissectProcessor, StreamlangDSL } from '../../../../..';
import { transpile } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Streamlang to ES|QL - Dissect Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest(
      'should correctly parse a log line with the dissect processor',
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
        expect(esqlResult.documents[0]).toEqual(
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

    streamlangApiTest(
      'should ignore dissected fields when ignore_missing is true',
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
          { expect: 'undissected', log: { level: 'undissected' } },
          {
            expect: 'dissected',
            log: { level: 'undissected' },
            message: '[2025-01-01T00:00:00.000Z] [dissected] 127.0.0.1',
          },
          { expect: 'null', log: { level: 'undissected' }, message: '2025-01-01T00:00:00.000Z]' },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // Based on whether `message` field exists, asserted expected dissected values
        for (const esqlDoc of esqlResult.documents.filter((d) => typeof d.expect !== 'undefined')) {
          const expectation = esqlDoc.expect === 'null' ? null : esqlDoc.expect;
          expect(esqlDoc['log.level']).toEqual(expectation);
        }
      }
    );

    streamlangApiTest(
      'should produce empty dissections when ignore_missing is false',
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

        expect(esqlResult.documents[1]['log.level']).toBeNull(); // Overwritten to null as ignore_missing is false
        expect(esqlResult.documents[1]['client.ip']).toBeNull();
      }
    );

    streamlangApiTest('should use append_separator', async ({ testBed, esql }) => {
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
      expect(esqlResult.documents[0]).toEqual(
        expect.objectContaining({
          field1: 'value1,value2',
        })
      );
    });

    streamlangApiTest('should not dissect when where is false', async ({ testBed, esql }) => {
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

      // ES|QL's FORK command may change the order of documents, so we need to check each document individually
      for (const doc of esqlResult.documents) {
        if (doc['attributes.should_exist'] === 'YES') {
          expect(doc).toEqual(
            expect.objectContaining({
              'log.level': 'info',
            })
          );
        } else if (doc['log.level'] !== '') {
          // Not the mapping doc
          expect(doc['log.level']).toBeNull();
        }
      }
    });

    // The following test tests field type mismatches and how dissect with clause where handles them.
    // e.g. for a document { log: { severity: 3 } }, a DISSECT pattern like [%{log.severity}]
    // will extract log.severity as a string (DISSECT always outputs keyword/string).
    // In this case if the indexed log.severity if of different type e.g. long/integer, ES|QL will fail with:
    // `verification_exception: Found 1 problem line 1:1: Column [log.severity] has conflicting data types in FORK branches: [LONG] and [KEYWORD]`
    streamlangApiTest(
      'should handle field type mismatches gracefully',
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

        // ES|QL's FORK command may change the order of documents, so we need to check each document individually
        for (const doc of esqlResult.documents) {
          // If a document has a dissected field, confirm the values and types
          if (doc['attributes.should_exist'] === 'YES') {
            expect(['info', 'warn', 'error']).toContain(doc['log.level']);
            expect(typeof doc['log.level']).toBe('string');
          }

          if (doc['log.severity'] !== null) {
            expect(typeof doc['log.severity']).toBe('string');
            expect(['3', '4', '5']).toContain(doc['log.severity']);
          }
          if (doc['log.size'] !== null) {
            expect(typeof doc['log.size']).toBe('string');
            expect(['1024', '4096']).toContain(doc['log.size']); // '2048' shouldn't be present as that doc had should_exist false
          }
          if (doc['log.ratio'] !== null) {
            expect(typeof doc['log.ratio']).toBe('string');
            expect(['50.55']).toContain(doc['log.ratio']);
          }
        }
      }
    );

    streamlangApiTest(
      'should dissect only when both ignore_missing and where conditions match (FORK logic)',
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

        const dissected = esqlResult.documents.filter((d) => d.case === 'both');
        expect(dissected.length).toBe(1);
        expect(dissected[0]['log.level']).toBe('info');
        expect(dissected[0]['client.ip']).toBe('10.1.1.1');

        // Skipped docs should not have client.ip newly populated (remains '' from mapping or undefined)
        for (const doc of esqlResult.documents.filter((d) =>
          ['no_message', 'no_where', 'none'].includes(String(d.case))
        )) {
          switch (doc.case) {
            case 'no_message':
              // original numeric level cast to string by pre-cast
              expect(doc['log.level']).toBe('5');
              expect([null]).toContain(doc['client.ip']);
              break;
            case 'no_where':
              // message present but where fails, no dissection
              expect(doc['log.level']).toBe('orig');
              expect([null]).toContain(doc['client.ip']);
              break;
            case 'none':
              expect(doc['log.level']).toBe('other');
              expect([null]).toContain(doc['client.ip']);
              break;
          }
        }
      }
    );

    streamlangApiTest(
      'should handle an exhaustive dissect pattern with modifiers and mixed documents',
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

        for (const doc of esqlResult.documents.filter((d) => d.case)) {
          switch (doc.case) {
            case 'full':
              expect(doc['@timestamp']).toBe('2025-01-01T00:00:00Z');
              expect(doc['user.full_name']).toBe('john doe');
              expect(doc['client.ip']).toBe('10.0.0.1');
              expect(doc.path).toBe('part1 part2');
              expect(doc.elapsed).toBe('9800'); // Cast to string by pre-cast
              break;
            case 'override':
              expect(doc['@timestamp']).toBe('2025-02-01T00:00:01Z');
              expect(doc['user.full_name']).toBe('alice alice');
              expect(doc['client.ip']).toBe('192.168.0.5');
              expect(doc.path).toBe('segA segB');
              expect(doc.elapsed).toBe('5500'); // Cast to string by pre-cast
              break;
            case 'skip_missing':
              // Not dissected; original values remain (cast to string)
              expect(doc['user.full_name']).toBe('keep');
              expect(doc['client.ip']).toBe('9.9.9.9');
              expect(doc.path).toBeNull();
              break;
            case 'skip_where':
              // Where false; should be untouched (path undefined)
              expect(doc['user.full_name']).toBeNull();
              expect(doc['client.ip']).toBeNull();
              expect(doc.path).toEqual('should_not_grok');
              expect(doc.elapsed).toEqual('4400'); // Keep original, cast to string
              expect(doc.status).toEqual(203); // Non operand field remains number
              break;
          }
        }
      }
    );

    streamlangApiTest(
      'should not be able to retain ingested precision if field is mapped as long',
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

        for (const doc of esqlResult.documents.filter((d) => d.case)) {
          switch (doc.case) {
            case 'dissected':
              expect(parseFloat(doc.size as string)).toBeCloseTo(3.1415); // Because dissected as string
              break;
            case 'skipped':
              // size: 88.99 is read as 88 by ES|QL because it's mapped as "long" in the index
              // the DISSECT casts it as string
              expect(parseFloat(doc.size as string)).toEqual(88);
              break;
          }
        }
      }
    );

    streamlangApiTest('should reject Mustache template syntax {{ and {{{', async () => {
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
      expect(() => transpile(streamlangDSL)).toThrow();
    });
  }
);
