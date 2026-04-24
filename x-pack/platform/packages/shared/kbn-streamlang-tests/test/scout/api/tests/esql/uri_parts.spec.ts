/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { StreamlangDSL, UriPartsProcessor } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

/**
 * ES|QL `URI_PARTS` tests. The csv-spec edge cases (`testNoSchemeUri`,
 * `testInvalidUri`) introduced with elasticsearch#140004 are pinned explicitly
 * because our transpiler's `remove_if_successful` success heuristic depends on
 * their documented behaviour (relative URIs parse, invalid URIs null every
 * output column with a warning).
 */
apiTest.describe('Streamlang to ES|QL - URI Parts Processor', () => {
  apiTest(
    'extracts every documented sub-field from a full URI',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-esql-uri-parts-full';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'attributes.href',
            to: 'url',
          } as UriPartsProcessor,
        ],
      };
      const { query } = await transpile(streamlangDSL);

      // ES|QL requires every operand column to be pre-mapped.
      const mappingDoc = {
        attributes: { href: '' },
        url: {
          scheme: '',
          domain: '',
          fragment: '',
          path: '',
          extension: '',
          port: 0,
          query: '',
          user_info: '',
          username: '',
          password: '',
          original: '',
        },
      };
      const docs = [
        mappingDoc,
        {
          case: 'full',
          attributes: {
            href: 'http://myusername:mypassword@www.example.com:80/foo.gif?key1=val1&key2=val2#fragment',
          },
        },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      const fullDoc = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'full');

      expect(fullDoc).toStrictEqual(
        expect.objectContaining({
          'url.scheme': 'http',
          'url.domain': 'www.example.com',
          'url.path': '/foo.gif',
          'url.extension': 'gif',
          'url.port': 80,
          'url.query': 'key1=val1&key2=val2',
          'url.fragment': 'fragment',
          'url.user_info': 'myusername:mypassword',
          'url.username': 'myusername',
          'url.password': 'mypassword',
          'url.original':
            'http://myusername:mypassword@www.example.com:80/foo.gif?key1=val1&key2=val2#fragment',
        })
      );
    }
  );

  apiTest(
    'testNoSchemeUri — relative URIs parse with null scheme+domain and populated path/query',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      // Mirrors the csv-spec `testNoSchemeUri` case. Critical because our
      // `remove_if_successful` implementation assumes relative URIs count as a
      // successful parse — see src/actions/uri_parts/constants.ts.
      const indexName = 'stream-e2e-test-esql-uri-parts-no-scheme';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'attributes.href',
            to: 'url',
          } as UriPartsProcessor,
        ],
      };
      const { query } = await transpile(streamlangDSL);

      const mappingDoc = {
        attributes: { href: '' },
        url: {
          scheme: '',
          domain: '',
          fragment: '',
          path: '',
          extension: '',
          port: 0,
          query: '',
          user_info: '',
          username: '',
          password: '',
          original: '',
        },
      };
      const docs = [
        mappingDoc,
        { case: 'relative', attributes: { href: '/app/login?session=expired' } },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      const doc = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'relative');

      expect(doc?.['url.path']).toBe('/app/login');
      expect(doc?.['url.query']).toBe('session=expired');
      expect(doc?.['url.scheme']).toBeNull();
      expect(doc?.['url.domain']).toBeNull();
    }
  );

  apiTest(
    'testInvalidUri — unparseable inputs null every output column (and trigger a warning)',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      // Mirrors the csv-spec `testInvalidUri` case.
      const indexName = 'stream-e2e-test-esql-uri-parts-invalid';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'attributes.href',
            to: 'url',
          } as UriPartsProcessor,
        ],
      };
      const { query } = await transpile(streamlangDSL);

      const mappingDoc = {
        attributes: { href: '' },
        url: {
          scheme: '',
          domain: '',
          fragment: '',
          path: '',
          extension: '',
          port: 0,
          query: '',
          user_info: '',
          username: '',
          password: '',
          original: '',
        },
      };
      const docs = [mappingDoc, { case: 'invalid', attributes: { href: 'not a valid uri' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      const doc = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'invalid');

      // Every primary sub-field is null.
      for (const sub of [
        'url.scheme',
        'url.domain',
        'url.path',
        'url.query',
        'url.fragment',
        'url.user_info',
        'url.port',
      ]) {
        expect(doc?.[sub]).toBeNull();
      }
      // keep_original is gated on the same success predicate as
      // remove_if_successful, so unparseable inputs null `url.original` in
      // ES|QL to match the ingest processor (which writes nothing when
      // `ignore_failure: true` swallows a parse failure).
      expect(doc?.['url.original']).toBeNull();
    }
  );

  apiTest(
    'filters the document out when ignore_missing is false and the source is missing',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-esql-uri-parts-fail-missing';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'attributes.href',
            to: 'url',
            ignore_missing: false,
          } as UriPartsProcessor,
        ],
      };
      const { query } = await transpile(streamlangDSL);

      const mappingDoc = {
        attributes: { href: 'https://example.com/seed' },
        url: {
          scheme: '',
          domain: '',
          path: '',
          query: '',
          fragment: '',
          extension: '',
          port: 0,
          user_info: '',
          username: '',
          password: '',
          original: '',
        },
      };
      const docs = [mappingDoc, { attributes: { other: 'value' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Only the mapping doc survives the `WHERE NOT(attributes.href IS NULL)`
      // guard the ES|QL transpiler emits.
      expect(esqlResult.documentsWithoutKeywords).toHaveLength(1);
    }
  );

  apiTest(
    'only extracts parts when the where clause matches',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-esql-uri-parts-where';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'attributes.href',
            to: 'url',
            where: {
              field: 'attributes.should_process',
              eq: true,
            },
          } as UriPartsProcessor,
        ],
      };
      const { query } = await transpile(streamlangDSL);

      const mappingDoc = {
        attributes: { href: '', should_process: false },
        url: {
          scheme: '',
          domain: '',
          path: '',
          query: '',
          fragment: '',
          extension: '',
          port: 0,
          user_info: '',
          username: '',
          password: '',
          original: '',
        },
      };
      const docs = [
        mappingDoc,
        { case: 'yes', attributes: { should_process: true, href: 'https://example.com/a' } },
        { case: 'no', attributes: { should_process: false, href: 'https://skip.example/b' } },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      const processed = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'yes');
      const skipped = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'no');

      expect(processed?.['url.domain']).toBe('example.com');
      expect(skipped?.['url.domain']).toBeNull();
    }
  );

  apiTest(
    'rejects Mustache template syntax in `from`',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: '{{attributes.href}}',
            to: 'url',
          } as UriPartsProcessor,
        ],
      };
      await expect(transpile(streamlangDSL)).rejects.toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed'
      );
    }
  );
});
