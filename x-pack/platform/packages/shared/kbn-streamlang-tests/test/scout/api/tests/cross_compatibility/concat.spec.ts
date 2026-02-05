/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { ConcatProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql, transpileIngestPipeline } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Concat Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest(
    'should concatenate fields and literals in both ingest pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first_name' },
              { type: 'literal', value: '.' },
              { type: 'field', value: 'last_name' },
              { type: 'literal', value: '@' },
              { type: 'field', value: 'email_domain' },
            ],
            to: 'full_email',
          } as ConcatProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          first_name: 'john',
          last_name: 'doe',
          email_domain: 'example.com',
        },
        {
          first_name: 'jane',
          last_name: 'smith',
          email_domain: 'example.com',
        },
      ];

      await testBed.ingest('ingest-e2e-test-concat-basic', docs, processors);
      const ingestResult = await testBed.getDocs('ingest-e2e-test-concat-basic');

      await testBed.ingest('esql-e2e-test-concat-basic', docs);
      const esqlResult = await esql.queryOnIndex('esql-e2e-test-concat-basic', query);

      expect(ingestResult).toHaveLength(2);
      expect(ingestResult[0]?.full_email).toBe('john.doe@example.com');
      expect(ingestResult[1]?.full_email).toBe('jane.smith@example.com');

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.full_email).toBe('john.doe@example.com');
      expect(esqlResult.documents[1]?.full_email).toBe('jane.smith@example.com');
    }
  );

  apiTest(
    'should concatenate fields and literals with a where clause in both ingest pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first_name' },
              { type: 'literal', value: '.' },
              { type: 'field', value: 'last_name' },
              { type: 'literal', value: '@' },
              { type: 'field', value: 'email_domain' },
            ],
            to: 'full_email',
            where: {
              field: 'has_email',
              eq: true,
            },
          } as ConcatProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        { first_name: 'john', last_name: 'doe', email_domain: 'example.com', has_email: true },
        { first_name: 'jane', last_name: 'smith', email_domain: 'example.com', has_email: false },
      ];

      await testBed.ingest('ingest-e2e-test-concat-with-where', docs, processors);
      const ingestResult = await testBed.getDocs('ingest-e2e-test-concat-with-where');

      await testBed.ingest('esql-e2e-test-concat-with-where', docs);
      const esqlResult = await esql.queryOnIndex('esql-e2e-test-concat-with-where', query);

      expect(ingestResult).toHaveLength(2);
      expect(ingestResult[0]?.full_email).toBe('john.doe@example.com');
      expect(ingestResult[1]?.full_email).toBeUndefined();

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.full_email).toBe('john.doe@example.com');
      expect(esqlResult.documents[1]?.full_email).toBeNull();
    }
  );

  apiTest(
    'should concatenate fields and literals with ignore_missing in both ingest pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first_name' },
              { type: 'literal', value: '.' },
              { type: 'field', value: 'last_name' },
              { type: 'literal', value: '@' },
              { type: 'field', value: 'email_domain' },
            ],
            to: 'full_email',
            ignore_missing: true,
          } as ConcatProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          first_name: 'john',
          last_name: 'doe',
          email_domain: 'example.com',
        },
        {
          first_name: 'jane',
          last_name: 'smith',
        },
      ];

      await testBed.ingest('ingest-e2e-test-concat-basic', docs, processors);
      const ingestResult = await testBed.getDocs('ingest-e2e-test-concat-basic');

      await testBed.ingest('esql-e2e-test-concat-basic', docs);
      const esqlResult = await esql.queryOnIndex('esql-e2e-test-concat-basic', query);

      expect(ingestResult).toHaveLength(2);
      expect(ingestResult[0]?.full_email).toBe('john.doe@example.com');
      expect(ingestResult[1]?.full_email).toBe('jane.smith@');

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.full_email).toBe('john.doe@example.com');
      expect(esqlResult.documents[1]?.full_email).toBe('jane.smith@');
    }
  );

  apiTest(
    'should not concatenate fields and literals with ignore_missing false and some fields missing in both ingest pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first_name' },
              { type: 'literal', value: '.' },
              { type: 'field', value: 'last_name' },
              { type: 'literal', value: '@' },
              { type: 'field', value: 'email_domain' },
            ],
            to: 'full_email',
          } as ConcatProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          first_name: 'john',
          last_name: 'doe',
          email_domain: 'example.com',
        },
        {
          first_name: 'jane',
          last_name: 'smith',
        },
      ];

      await testBed.ingest('ingest-e2e-test-concat-basic', docs, processors);
      const ingestResult = await testBed.getDocs('ingest-e2e-test-concat-basic');

      await testBed.ingest('esql-e2e-test-concat-basic', docs);
      const esqlResult = await esql.queryOnIndex('esql-e2e-test-concat-basic', query);

      expect(ingestResult).toHaveLength(2);
      expect(ingestResult[0]?.full_email).toBe('john.doe@example.com');
      expect(ingestResult[1]?.full_email).toBeUndefined();

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.full_email).toBe('john.doe@example.com');
      expect(esqlResult.documents[1]?.full_email).toBeNull();
    }
  );
});
