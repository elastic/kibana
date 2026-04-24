/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { StreamlangDSL, UriPartsProcessor } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { asDoc } from '../../fixtures/doc_utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - URI Parts Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('extracts every documented sub-field from a full URI', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-uri-parts-full';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uri_parts',
            from: 'attributes.href',
            to: 'url',
          } as UriPartsProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);
      const docs = [
        {
          attributes: {
            href: 'http://myusername:mypassword@www.example.com:80/foo.gif?key1=val1&key2=val2#fragment',
          },
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingested = await testBed.getDocs(indexName);
      expect(ingested).toHaveLength(1);
      const url = asDoc(asDoc(ingested[0])?.url);
      expect(url).toMatchObject({
        scheme: 'http',
        domain: 'www.example.com',
        path: '/foo.gif',
        extension: 'gif',
        port: 80,
        query: 'key1=val1&key2=val2',
        fragment: 'fragment',
        user_info: 'myusername:mypassword',
        username: 'myusername',
        password: 'mypassword',
        original:
          'http://myusername:mypassword@www.example.com:80/foo.gif?key1=val1&key2=val2#fragment',
      });
    });

    apiTest('keep_original=false omits the `.original` sub-field', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-uri-parts-keep-original-false';
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

      const { processors } = await transpile(streamlangDSL);
      const docs = [{ attributes: { href: 'https://example.com/a?b=c' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingested = await testBed.getDocs(indexName);
      const url = asDoc(asDoc(ingested[0])?.url);
      expect(url?.domain).toBe('example.com');
      expect(url?.original).toBeUndefined();
    });

    apiTest(
      'remove_if_successful=true drops the source field on a successful parse',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-uri-parts-remove-success';
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
              remove_if_successful: true,
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpile(streamlangDSL);
        const docs = [{ attributes: { href: 'https://example.com/ok' } }];
        await testBed.ingest(indexName, docs, processors);

        const ingested = await testBed.getDocs(indexName);
        const source = asDoc(ingested[0]);
        expect(asDoc(source?.attributes)?.href).toBeUndefined();
        expect(asDoc(source?.url)?.domain).toBe('example.com');
      }
    );

    apiTest(
      'remove_if_successful=true keeps the source field when the parse fails (ignore_failure=true)',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-uri-parts-remove-failure';
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uri_parts',
              from: 'attributes.href',
              to: 'url',
              remove_if_successful: true,
              ignore_failure: true,
            } as UriPartsProcessor,
          ],
        };

        const { processors } = await transpile(streamlangDSL);
        const docs = [{ attributes: { href: 'not a valid uri' } }];
        await testBed.ingest(indexName, docs, processors);

        const ingested = await testBed.getDocs(indexName);
        const source = asDoc(ingested[0]);
        // Source preserved because the parse failed.
        expect(asDoc(source?.attributes)?.href).toBe('not a valid uri');
      }
    );

    apiTest(
      'ignore_missing=true lets documents without the source through',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-uri-parts-ignore-missing';
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

        const { processors } = await transpile(streamlangDSL);
        const docs = [{ attributes: { other: 'value' } }];
        await testBed.ingest(indexName, docs, processors);

        const ingested = await testBed.getDocs(indexName);
        expect(ingested).toHaveLength(1);
        const source = asDoc(ingested[0]);
        expect(asDoc(source?.url)).toBeUndefined();
      }
    );

    apiTest(
      'ignore_missing=false fails ingest when the source field is missing',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-uri-parts-fail-missing';
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

        const { processors } = await transpile(streamlangDSL);
        const docs = [{ attributes: { other: 'value' } }];
        const { errors } = await testBed.ingest(indexName, docs, processors);
        expect(errors[0].reason).toContain('attributes.href');
      }
    );

    apiTest(
      'ignore_failure=true lets unparseable URIs pass through untouched',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-uri-parts-ignore-failure';
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

        const { processors } = await transpile(streamlangDSL);
        const docs = [{ attributes: { href: 'not a valid uri' }, other: 'preserved' }];
        await testBed.ingest(indexName, docs, processors);

        const ingested = await testBed.getDocs(indexName);
        expect(ingested).toHaveLength(1);
        const source = asDoc(ingested[0]);
        expect(source?.other).toBe('preserved');
        expect(asDoc(source?.attributes)?.href).toBe('not a valid uri');
        expect(asDoc(source?.url)).toBeUndefined();
      }
    );

    apiTest('only extracts parts when the where clause matches', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-uri-parts-where';
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

      const { processors } = await transpile(streamlangDSL);
      const docs = [
        { case: 'yes', attributes: { should_process: true, href: 'https://example.com/a' } },
        { case: 'no', attributes: { should_process: false, href: 'https://skip.example/b' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingested = await testBed.getDocs(indexName);
      const processed = ingested.find((d) => asDoc(d)?.case === 'yes');
      const skipped = ingested.find((d) => asDoc(d)?.case === 'no');

      expect(asDoc(asDoc(processed)?.url)?.domain).toBe('example.com');
      expect(asDoc(asDoc(skipped)?.url)).toBeUndefined();
    });

    apiTest('rejects Mustache template syntax in `from`', async () => {
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
    });
  }
);
