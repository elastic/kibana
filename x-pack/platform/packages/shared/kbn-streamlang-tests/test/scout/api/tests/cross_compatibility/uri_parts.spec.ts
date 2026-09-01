/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { StreamlangDSL, UriPartsProcessor } from '@kbn/streamlang';
import { transpileEsql, transpileIngestPipeline } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

/**
 * Cross-compatibility suite for the `uri_parts` processor.
 *
 * The ingest-pipeline path uses the native Elasticsearch `uri_parts` processor;
 * the ES|QL path uses the `URI_PARTS` processing command introduced in
 * elasticsearch#140004. This suite asserts the Streamlang transpilers produce
 * equivalent extracted columns for shared inputs, and pins the csv-spec-level
 * edge cases (relative URIs, invalid URIs) across both paths.
 */
apiTest.describe(
  'Cross-compatibility - URI Parts Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // *** Compatible cases ***
    apiTest(
      'extracts every documented sub-field from a fully-populated URI in both transpilers',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const docs = [
          {
            case: 'full',
            attributes: {
              href: 'http://myusername:mypassword@www.example.com:80/foo.gif?key1=val1&key2=val2#fragment',
            },
          },
        ];

        await testBed.ingest('ingest-uri-parts-full', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-uri-parts-full');

        // ES|QL requires every operand column to be pre-mapped, so include a
        // mapping doc carrying every sub-field produced by URI_PARTS.
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
        await testBed.ingest('esql-uri-parts-full', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-uri-parts-full', query);
        const esqlDoc = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'full');

        const expectedParts = {
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
        };

        expect(ingestResult[0]).toStrictEqual(expect.objectContaining(expectedParts));
        expect(esqlDoc).toStrictEqual(expect.objectContaining(expectedParts));
      }
    );

    apiTest('honors a custom target prefix in both transpilers', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'attributes.href',
            to: 'attributes.parts',
          } as UriPartsProcessor,
        ],
      };

      const { processors } = await transpileIngestPipeline(streamlangDSL);
      const { query } = await transpileEsql(streamlangDSL);

      const docs = [
        { case: 'custom', attributes: { href: 'https://example.com/login?next=/home' } },
      ];

      await testBed.ingest('ingest-uri-parts-custom', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-uri-parts-custom');

      const mappingDoc = {
        attributes: {
          href: '',
          parts: {
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
        },
      };
      await testBed.ingest('esql-uri-parts-custom', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-uri-parts-custom', query);
      const esqlDoc = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'custom');

      const expected = {
        'attributes.parts.scheme': 'https',
        'attributes.parts.domain': 'example.com',
        'attributes.parts.path': '/login',
        'attributes.parts.query': 'next=/home',
      };
      expect(ingestResult[0]).toStrictEqual(expect.objectContaining(expected));
      expect(esqlDoc).toStrictEqual(expect.objectContaining(expected));
    });

    // *** csv-spec edge cases (elasticsearch#140004) ***

    apiTest(
      'parses relative URIs with null scheme+domain but populated path/query in both transpilers (testNoSchemeUri parity)',
      async ({ testBed, esql }) => {
        // Mirrors the csv-spec `testNoSchemeUri` case: `/app/login?session=expired`
        // must parse successfully, leaving scheme and domain null while path and
        // query are populated. This is why the success signal for
        // `remove_if_successful` has to OR across every primary sub-field and
        // cannot rely on `scheme IS NOT NULL` alone.
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const docs = [{ case: 'relative', attributes: { href: '/app/login?session=expired' } }];

        await testBed.ingest('ingest-uri-parts-relative', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-uri-parts-relative');

        const mappingDoc = {
          attributes: { href: '' },
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
        await testBed.ingest('esql-uri-parts-relative', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-uri-parts-relative', query);
        const esqlDoc = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'relative');

        // ES|QL exposes unpopulated columns as `null` (column-based model), while
        // the ingest processor simply omits them. Both outputs must agree on the
        // populated parts, and both must populate `path` and `query`.
        expect(ingestResult[0]['url.path']).toBe('/app/login');
        expect(ingestResult[0]['url.query']).toBe('session=expired');
        expect(ingestResult[0]['url.scheme']).toBeUndefined();
        expect(ingestResult[0]['url.domain']).toBeUndefined();

        expect(esqlDoc?.['url.path']).toBe('/app/login');
        expect(esqlDoc?.['url.query']).toBe('session=expired');
        expect(esqlDoc?.['url.scheme']).toBeNull();
        expect(esqlDoc?.['url.domain']).toBeNull();
      }
    );

    apiTest(
      'invalid URIs null every output column in ES|QL and, with ignore_failure=true, leave the ingest doc unchanged (testInvalidUri parity)',
      async ({ testBed, esql }) => {
        // Mirrors the csv-spec `testInvalidUri` case. NOTE: the ingest processor
        // throws when given an unparseable input, so we have to set
        // `ignore_failure: true` to keep the document; ES|QL emits a warning
        // and continues with every output column set to null.
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
              ignore_failure: true,
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const docs = [{ case: 'invalid', attributes: { href: 'not a valid uri' } }];

        await testBed.ingest('ingest-uri-parts-invalid', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-uri-parts-invalid');

        const mappingDoc = {
          attributes: { href: '' },
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
        await testBed.ingest('esql-uri-parts-invalid', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-uri-parts-invalid', query);
        const esqlDoc = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'invalid');

        // Ingest: ignore_failure=true swallows the parse error and leaves the
        // document unchanged (source still present, no url.* keys added).
        expect(ingestResult[0]['attributes.href']).toBe('not a valid uri');
        expect(ingestResult[0]['url.scheme']).toBeUndefined();
        expect(ingestResult[0]['url.domain']).toBeUndefined();
        expect(ingestResult[0]['url.path']).toBeUndefined();
        // `url.original` must stay undefined on the ingest path — keep_original
        // is coupled to a successful parse in the ES processor.
        expect(ingestResult[0]['url.original']).toBeUndefined();

        // ES|QL: the source keeps its value, every output column is null.
        expect(esqlDoc?.['attributes.href']).toBe('not a valid uri');
        expect(esqlDoc?.['url.scheme']).toBeNull();
        expect(esqlDoc?.['url.domain']).toBeNull();
        expect(esqlDoc?.['url.path']).toBeNull();
        expect(esqlDoc?.['url.query']).toBeNull();
        expect(esqlDoc?.['url.fragment']).toBeNull();
        // Parity: `url.original` must be null on the ES|QL path too, matching
        // the ingest processor's "nothing written on parse failure" behavior.
        expect(esqlDoc?.['url.original']).toBeNull();
      }
    );

    // *** Option parity ***

    apiTest(
      'keep_original=false drops `<prefix>.original` in both transpilers',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
              keep_original: false,
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const docs = [{ case: 'nokeep', attributes: { href: 'https://example.com/a?b=c' } }];

        await testBed.ingest('ingest-uri-parts-nokeep', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-uri-parts-nokeep');

        const mappingDoc = {
          attributes: { href: '' },
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
          },
        };
        await testBed.ingest('esql-uri-parts-nokeep', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-uri-parts-nokeep', query);
        const esqlDoc = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'nokeep');

        expect(ingestResult[0]['url.original']).toBeUndefined();
        // ES|QL doesn't emit a column at all when keep_original is false and no
        // mapping exists; if the index happened to pre-map it, it would be null.
        expect(esqlDoc?.['url.original']).toBeUndefined();

        // But the extracted parts still land in both.
        expect(ingestResult[0]['url.domain']).toBe('example.com');
        expect(esqlDoc?.['url.domain']).toBe('example.com');
      }
    );

    apiTest(
      'remove_if_successful=true nulls the source field on success in both transpilers, and keeps it on ignored failure',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
              keep_original: false,
              remove_if_successful: true,
              ignore_failure: true,
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const docs = [
          { case: 'success', attributes: { href: 'https://example.com/login' } },
          { case: 'failure', attributes: { href: 'not a valid uri' } },
        ];

        await testBed.ingest('ingest-uri-parts-remove', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-uri-parts-remove');

        const mappingDoc = {
          attributes: { href: '' },
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
          },
        };
        await testBed.ingest('esql-uri-parts-remove', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-uri-parts-remove', query);
        const successEsql = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'success');
        const failureEsql = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'failure');

        const successIngest = ingestResult.find((d) => d.case === 'success')!;
        const failureIngest = ingestResult.find((d) => d.case === 'failure')!;

        // Success: source dropped/nulled; parts populated.
        expect(successIngest['attributes.href']).toBeUndefined();
        expect(successIngest['url.domain']).toBe('example.com');
        expect(successEsql?.['attributes.href']).toBeNull();
        expect(successEsql?.['url.domain']).toBe('example.com');

        // Failure: source retained. Ingest keeps the field because the parse
        // error is swallowed by ignore_failure; ES|QL's URI_PARTS nulls every
        // output column but the source column itself is left alone since no
        // primary sub-field is non-null.
        expect(failureIngest['attributes.href']).toBe('not a valid uri');
        expect(failureEsql?.['attributes.href']).toBe('not a valid uri');
      }
    );

    // *** Conditional execution ***

    apiTest('where clause is respected by both transpilers', async ({ testBed, esql }) => {
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

      const { processors } = await transpileIngestPipeline(streamlangDSL);
      const { query } = await transpileEsql(streamlangDSL);

      const docs = [
        {
          case: 'processed',
          attributes: { should_process: true, href: 'https://example.com/a' },
        },
        {
          case: 'skipped',
          attributes: { should_process: false, href: 'https://skip.example.com/b' },
        },
      ];

      await testBed.ingest('ingest-uri-parts-where', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-uri-parts-where');

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
      await testBed.ingest('esql-uri-parts-where', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-uri-parts-where', query);
      const processedEsql = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'processed');
      const skippedEsql = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'skipped');

      const processedIngest = ingestResult.find((d) => d.case === 'processed')!;
      const skippedIngest = ingestResult.find((d) => d.case === 'skipped')!;

      // Processed row: both transpilers extract the domain.
      expect(processedIngest['url.domain']).toBe('example.com');
      expect(processedEsql?.['url.domain']).toBe('example.com');

      // Skipped row: documented behavioural difference — ingest simply omits
      // the sub-field, ES|QL emits null because every operand column must be
      // pre-mapped. Mirrors dissect / grok.
      expect(skippedIngest['url.domain']).toBeUndefined();
      expect(skippedEsql?.['url.domain']).toBeNull();
    });

    apiTest(
      'preserves pre-existing `<to>.*` and `<to>.original` values on where:false rows for every sub-field (destruction-fix parity, full coverage)',
      async ({ testBed, esql }) => {
        // Seeds a prior value for EVERY URI_PARTS sub-field (not just
        // `domain` + `original`) and asserts each one is preserved on the
        // `where:false` row in BOTH transpilers.
        //
        // The narrower variant of this test (preserving only `domain` and
        // `original`) misses the URI_PARTS empty-string sub-field leak: when
        // the conditional input gate fed URI_PARTS `""`, URI_PARTS emitted
        // `path = ""` (non-null), and the merge `COALESCE("" /* temp */,
        // "/prior/path" /* target */)` returned `""` because `""` is not
        // null in ES|QL. The fix is the NULL-sentinel gate
        // (`CASE(<where>, <from>, NULL)`); the csv-spec's `nullInputRow`
        // pins URI_PARTS(NULL) → every output sub-field NULL, so every
        // merge COALESCE preserves on gated rows.
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
              where: { field: 'attributes.should_process', eq: true },
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const priorUrl = {
          scheme: 'prior',
          domain: 'prior.example.com',
          path: '/prior/path',
          query: 'prior=1',
          fragment: 'prior-fragment',
          extension: 'priorext',
          port: 12345,
          user_info: 'prioruser:priorpass',
          username: 'prioruser',
          password: 'priorpass',
          original: 'prior://value',
        };

        const docs = [
          {
            case: 'processed',
            attributes: { should_process: true, href: 'https://new.example.com/a' },
            url: priorUrl,
          },
          {
            case: 'skipped',
            attributes: { should_process: false, href: 'https://ignored.example.com/b' },
            url: priorUrl,
          },
        ];

        await testBed.ingest('ingest-uri-parts-preserve', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-uri-parts-preserve');

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
        await testBed.ingest('esql-uri-parts-preserve', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-uri-parts-preserve', query);
        const processedEsql = esqlResult.documentsWithoutKeywords.find(
          (d) => d.case === 'processed'
        );
        const skippedEsql = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'skipped');

        const processedIngest = ingestResult.find((d) => d.case === 'processed')!;
        const skippedIngest = ingestResult.find((d) => d.case === 'skipped')!;

        // Processed row: new parse wins via COALESCE (temp first, target second).
        expect(processedIngest['url.domain']).toBe('new.example.com');
        expect(processedIngest['url.original']).toBe('https://new.example.com/a');
        expect(processedEsql?.['url.domain']).toBe('new.example.com');
        expect(processedEsql?.['url.original']).toBe('https://new.example.com/a');

        // Skipped row: BOTH transpilers must preserve the prior value of
        // EVERY sub-field. The pre-NULL-sentinel implementation would have
        // clobbered at least `url.path` (and possibly `url.extension`,
        // `url.query`, etc.) with empty strings because URI_PARTS("") emits
        // non-null empty strings for some sub-fields.
        for (const [subfield, priorValue] of Object.entries(priorUrl)) {
          const key = `url.${subfield}`;
          expect(skippedIngest[key]).toBe(priorValue);
          expect(skippedEsql?.[key]).toBe(priorValue);
        }
      }
    );

    apiTest(
      'ignore_missing=true lets documents without the source field through in both transpilers',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
              ignore_missing: true,
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const docs = [
          { case: 'present', attributes: { href: 'https://example.com/x' } },
          { case: 'missing', attributes: {} },
        ];

        await testBed.ingest('ingest-uri-parts-ignore-missing', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-uri-parts-ignore-missing'
        );
        expect(ingestResult).toHaveLength(2);
        const presentIngest = ingestResult.find((d) => d.case === 'present')!;
        const missingIngest = ingestResult.find((d) => d.case === 'missing')!;

        const mappingDoc = {
          attributes: { href: '' },
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
        await testBed.ingest('esql-uri-parts-ignore-missing', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-uri-parts-ignore-missing', query);

        const presentEsql = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'present');
        const missingEsql = esqlResult.documentsWithoutKeywords.find((d) => d.case === 'missing');

        // Present row: both transpilers extract the domain.
        expect(presentIngest['url.domain']).toBe('example.com');
        expect(presentEsql?.['url.domain']).toBe('example.com');

        // Missing row: documented omitted-vs-null divergence. Ingest keeps the
        // doc and writes nothing under `url.*` (row-based `_source` model, so
        // dashboards must filter with `exists(url.domain)`). ES|QL keeps the
        // doc and surfaces every declared column as `null` (column-based
        // model, so dashboards must filter with `url.domain IS NOT NULL`).
        // This cannot be normalized in the transpiler; see the
        // `uriParts.tips.nullVsOmitted` action metadata note surfaced in the
        // Streams UI processor catalog.
        expect(missingIngest['url.domain']).toBeUndefined();
        expect(missingEsql?.['url.domain']).toBeNull();
      }
    );

    apiTest(
      'missing source field with ignore_missing=false fails ingest and drops the ES|QL row',
      async ({ testBed, esql }) => {
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

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        // Parity note: this is the intentional ES|QL-vs-ingest divergence
        // documented on `buildIgnoreMissingFilter` in
        // transpilers/esql/processors/common.ts. Ingest raises a
        // "field [<from>] not present" error (rejecting the doc) because
        // `ignore_failure` is implicitly false; ES|QL has no per-row error
        // primitive so it pre-filters with WHERE and silently drops the row.
        // Both halves of the contract are asserted below.
        const docs = [{ case: 'missing', attributes: {} }];
        const { errors } = await testBed.ingest('ingest-uri-parts-fail-missing', docs, processors);
        // Ingest half: the doc is rejected with a "not present" error.
        expect(errors[0].reason).toContain('attributes.href');

        const mappingDoc = {
          attributes: { href: '' },
          url: { scheme: '', domain: '', path: '' },
        };
        await testBed.ingest('esql-uri-parts-fail-missing', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-uri-parts-fail-missing', query);

        // ES|QL half: the missing doc is silently dropped by the
        // `WHERE NOT(attributes.href IS NULL)` guard the transpiler emits.
        // Only the mapping doc survives.
        expect(esqlResult.documentsWithoutKeywords).toHaveLength(1);
      }
    );

    // *** Template validation: both transpilers must reject Mustache ***
    [
      { templateType: '{{ }}', from: '{{template_from}}' },
      { templateType: '{{{ }}}', from: '{{{template_from}}}' },
    ].forEach(({ templateType, from }) => {
      apiTest(
        `consistently rejects ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
        async () => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'uri_parts',
                from,
                to: 'url',
              } as UriPartsProcessor,
            ],
          };

          await expect(transpileIngestPipeline(streamlangDSL)).rejects.toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed'
          );
          await expect(transpileEsql(streamlangDSL)).rejects.toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed'
          );
        }
      );
    });
  }
);
