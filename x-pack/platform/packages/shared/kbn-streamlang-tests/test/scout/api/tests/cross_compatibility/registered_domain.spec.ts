/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RegisteredDomainProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Registered Domain Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should extract domain parts from an FQDN', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'registered_domain',
            prefix: 'domain',
            expression: 'expression',
          } as RegisteredDomainProcessor,
        ],
      };

      const docs = [{ expression: 'www.example.com' }];

      const { processors } = await transpileIngestPipeline(streamlangDSL);
      const { query } = await transpileEsql(streamlangDSL);

      await testBed.ingest('ingest-registered-domain-basic', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-registered-domain-basic');

      await testBed.ingest('esql-registered-domain-basic', docs);
      const esqlResult = await esql.queryOnIndex('esql-registered-domain-basic', query);

      expect(ingestResult).toHaveLength(1);
      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documentsWithoutKeywords[0]).toMatchObject({
        'domain.domain': 'www.example.com',
        'domain.registered_domain': 'example.com',
        'domain.subdomain': 'www',
        'domain.top_level_domain': 'com',
      });
    });

    apiTest(
      'should fail when expression field is of non-string type (e.g. numeric)',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'registered_domain',
              prefix: 'domain',
              expression: 'expression',
            } as RegisteredDomainProcessor,
          ],
        };

        const docs = [{ expression: 0 }];

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const { errors } = await testBed.ingest(
          'ingest-registered-domain-numeric',
          docs,
          processors
        );
        await testBed.ingest('esql-registered-domain-numeric', docs);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toStrictEqual({
          type: 'illegal_argument_exception',
          reason:
            'field [expression] of type [java.lang.Integer] cannot be cast to [java.lang.String]',
        });

        await expect(esql.queryOnIndex('esql-registered-domain-numeric', query)).rejects.toThrow(
          'Input for REGISTERED_DOMAIN must be of type [string] but is [long]'
        );
      }
    );

    apiTest(
      'should extract domain parts from a FQDN with a missing part',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'registered_domain',
              prefix: 'domain',
              expression: 'expression',
            } as RegisteredDomainProcessor,
          ],
        };

        const docs = [{ expression: 'example.co' }];

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        await testBed.ingest('ingest-registered-domain-missing-part', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-registered-domain-missing-part'
        );

        await testBed.ingest('esql-registered-domain-missing-part', docs);
        const esqlResult = await esql.queryOnIndex('esql-registered-domain-missing-part', query);

        expect(ingestResult).toHaveLength(1);
        expect(ingestResult[0]['domain.subdomain']).toBeUndefined();

        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documentsWithoutKeywords[0]['domain.subdomain']).toBeNull();
      }
    );

    apiTest(
      'should apply conditional extraction to only matching documents',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'registered_domain',
              prefix: 'domain',
              expression: 'expression',
              where: {
                field: 'expression',
                endsWith: 'com',
              },
            } as RegisteredDomainProcessor,
          ],
        };

        const docs = [{ expression: 'www.example.com' }, { expression: 'www.example.co' }];

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        await testBed.ingest('ingest-registered-domain-conditional', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-registered-domain-conditional'
        );

        await testBed.ingest('esql-registered-domain-conditional', docs);
        const esqlResult = await esql.queryOnIndex('esql-registered-domain-conditional', query);

        expect(ingestResult).toHaveLength(2);
        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[0]);
        expect(ingestResult[1]['domain.domain']).toBeUndefined();

        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.documentsWithoutKeywordsOrdered[0]['domain.domain']).toBe(
          'www.example.com'
        );
        expect(esqlResult.documentsWithoutKeywordsOrdered[1]['domain.domain']).toBeNull();
      }
    );

    apiTest('should handle missing expression field', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'registered_domain',
            prefix: 'domain',
            expression: 'expression',
          } as RegisteredDomainProcessor,
        ],
      };

      const docs = [{ message: 'test' }];
      const mappingDoc = { expression: '' };

      const { processors } = await transpileIngestPipeline(streamlangDSL);
      const { query } = await transpileEsql(streamlangDSL);

      await testBed.ingest('ingest-registered-domain-missing-expression', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered(
        'ingest-registered-domain-missing-expression'
      );

      await testBed.ingest('esql-registered-domain-missing-expression', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex(
        'esql-registered-domain-missing-expression',
        query
      );

      expect(ingestResult).toHaveLength(1);
      expect(ingestResult[0]['domain.domain']).toBeUndefined();

      const esqlDocsWithoutMapping = esqlResult.documentsWithoutKeywords.filter(
        (d: Record<string, unknown>) => d.message
      );

      expect(esqlDocsWithoutMapping).toHaveLength(1);
      expect(esqlDocsWithoutMapping[0]['domain.domain']).toBeNull();
    });

    apiTest(
      'should fail in Ingest Pipelines when expression field is missing with ignore_missing: false',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'registered_domain',
              prefix: 'domain',
              expression: 'expression',
              ignore_missing: false,
            } as RegisteredDomainProcessor,
          ],
        };

        const docs = [{ message: 'test' }];
        const mappingDoc = { expression: '' };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const { errors } = await testBed.ingest(
          'ingest-registered-domain-missing-expression-ignore-false',
          docs,
          processors
        );

        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
          type: 'illegal_argument_exception',
          reason: 'field [expression] not present as part of path [expression]',
        });

        await testBed.ingest('esql-registered-domain-missing-expression-ignore-false', [
          mappingDoc,
          ...docs,
        ]);
        const esqlResult = await esql.queryOnIndex(
          'esql-registered-domain-missing-expression-ignore-false',
          query
        );

        const esqlDocsWithoutMapping = esqlResult.documentsWithoutKeywords.filter(
          (d: Record<string, unknown>) => d.message
        );

        // NOTE: Ingest Pipeline returns an error while ES|QL skips processing the doc
        expect(esqlDocsWithoutMapping).toHaveLength(0);
      }
    );

    apiTest('should handle pre-existing value', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'registered_domain',
            prefix: 'domain',
            expression: 'expression',
          } as RegisteredDomainProcessor,
        ],
      };

      // First doc has no subdomain in result ('example.com') → pre-existing value should be preserved
      // Second doc has a subdomain in result ('www.example.com') → pre-existing value should be overwritten
      const docs = [
        { expression: 'example.com', domain: { subdomain: 'test' } },
        { expression: 'www.example.com', domain: { subdomain: 'test' } },
      ];

      const { processors } = await transpileIngestPipeline(streamlangDSL);
      const { query } = await transpileEsql(streamlangDSL);

      await testBed.ingest('ingest-registered-domain-pre-existing', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered(
        'ingest-registered-domain-pre-existing'
      );

      await testBed.ingest('esql-registered-domain-pre-existing', docs);
      const esqlResult = await esql.queryOnIndex('esql-registered-domain-pre-existing', query);

      expect(ingestResult).toHaveLength(2);
      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[0]);
      expect(ingestResult[1]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[1]);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documentsWithoutKeywordsOrdered[0]['domain.subdomain']).toBe('test');
      expect(esqlResult.documentsWithoutKeywordsOrdered[1]['domain.subdomain']).toBe('www');
    });

    apiTest(
      'should handle pre-existing value with conditional extraction',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'registered_domain',
              prefix: 'domain',
              expression: 'expression',
              where: {
                field: 'should_process',
                eq: true,
              },
            } as RegisteredDomainProcessor,
          ],
        };

        const docs = [
          { expression: 'www.example.com', should_process: true, domain: { subdomain: 'test' } },
          { expression: 'www.example.com', domain: { subdomain: 'test' } },
        ];

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        await testBed.ingest('ingest-registered-domain-pre-existing-conditional', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-registered-domain-pre-existing-conditional'
        );

        await testBed.ingest('esql-registered-domain-pre-existing-conditional', docs);
        const esqlResult = await esql.queryOnIndex(
          'esql-registered-domain-pre-existing-conditional',
          query
        );

        expect(ingestResult).toHaveLength(2);
        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[0]);
        expect(ingestResult[1]['domain.domain']).toBeUndefined();
        expect(ingestResult[1]['domain.subdomain']).toBe(
          esqlResult.documentsWithoutKeywordsOrdered[1]['domain.subdomain']
        );

        expect(esqlResult.documents).toHaveLength(2);
        // Matching doc: processed, pre-existing value overwritten
        expect(esqlResult.documentsWithoutKeywordsOrdered[0]['domain.subdomain']).toBe('www');
        expect(esqlResult.documentsWithoutKeywordsOrdered[1]['domain.domain']).toBeNull();
        // Non-matching doc: not processed, pre-existing value preserved
        expect(esqlResult.documentsWithoutKeywordsOrdered[1]['domain.subdomain']).toBe('test');
      }
    );
  }
);
