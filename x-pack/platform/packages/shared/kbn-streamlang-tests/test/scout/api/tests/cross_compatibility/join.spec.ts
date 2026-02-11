/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { StreamlangDSL, JoinProcessor } from '@kbn/streamlang';
import { transpileEsql, transpileIngestPipeline } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Join Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest('should join fields with a delimiter', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'join',
          from: ['field1', 'field2', 'field3'],
          to: 'my_joined_field',
          delimiter: ', ',
        } as JoinProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      {
        field1: 'first',
        field2: 'second',
        field3: 'third',
      },
    ];

    await testBed.ingest('ingest-e2e-test-join-basic', docs, processors);
    const ingestResult = await testBed.getDocs('ingest-e2e-test-join-basic');

    await testBed.ingest('esql-e2e-test-join-basic', docs);
    const esqlResult = await esql.queryOnIndex('esql-e2e-test-join-basic', query);

    expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[0]);
    expect(ingestResult[0]).toHaveProperty('my_joined_field', 'first, second, third');
  });

  apiTest(
    'should join fields with a delimiter when using where clause',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'join',
            from: ['field1', 'field2', 'field3'],
            to: 'my_joined_field',
            delimiter: ', ',
            where: {
              field: 'field1',
              eq: 'first',
            },
          } as JoinProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          field1: 'one',
          field2: 'two',
          field3: 'three',
        },
        {
          field1: 'first',
          field2: 'second',
          field3: 'third',
        },
      ];

      await testBed.ingest('ingest-e2e-test-join-conditional', docs, processors);
      const ingestResult = await testBed.getDocs('ingest-e2e-test-join-conditional');

      await testBed.ingest('esql-e2e-test-join-conditional', docs);
      const esqlResult = await esql.queryOnIndex('esql-e2e-test-join-conditional', query);

      expect(ingestResult).toHaveLength(2);
      expect(esqlResult.documents).toHaveLength(2);

      expect(esqlResult.documentsOrdered[0]).toHaveProperty('my_joined_field', null);
      expect(ingestResult[0]).not.toHaveProperty('my_joined_field');

      expect(ingestResult[1]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[1]);
      expect(ingestResult[1]).toHaveProperty('my_joined_field', 'first, second, third');
    }
  );

  apiTest(
    'should not join fields with a delimiter when field is missing',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'join',
            from: ['field1', 'field2', 'field3'],
            to: 'my_joined_field',
            delimiter: ', ',
          } as JoinProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          field1: 'first',
          field2: 'second',
          field3: 'third',
        },
        {
          field1: 'first',
          field3: 'third',
        },
      ];

      await testBed.ingest('ingest-e2e-test-join-missing', docs, processors);
      const ingestResult = await testBed.getDocs('ingest-e2e-test-join-missing');

      await testBed.ingest('esql-e2e-test-join-missing', docs);
      const esqlResult = await esql.queryOnIndex('esql-e2e-test-join-missing', query);

      expect(ingestResult).toHaveLength(2);
      expect(esqlResult.documents).toHaveLength(2);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[0]);
      expect(ingestResult[0]).toHaveProperty('my_joined_field', 'first, second, third');

      expect(ingestResult[1]).not.toHaveProperty('my_joined_field');
      expect(esqlResult.documentsOrdered[1]).toHaveProperty('my_joined_field', null);
    }
  );

  apiTest(
    'should join fields with a delimiter when field is missing and ignore_missing is true',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'join',
            from: ['field1', 'field2', 'field3'],
            to: 'my_joined_field',
            delimiter: ', ',
            ignore_missing: true,
          } as JoinProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          field1: 'first',
          field2: 'second',
          field3: 'third',
        },
        {
          field1: 'first',
          field3: 'third',
        },
      ];

      await testBed.ingest('ingest-e2e-test-join-missing-ignore', docs, processors);
      const ingestResult = await testBed.getDocs('ingest-e2e-test-join-missing-ignore');

      await testBed.ingest('esql-e2e-test-join-missing-ignore', docs);
      const esqlResult = await esql.queryOnIndex('esql-e2e-test-join-missing-ignore', query);

      expect(ingestResult).toHaveLength(2);
      expect(esqlResult.documents).toHaveLength(2);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered[0]);
      expect(ingestResult[0]).toHaveProperty('my_joined_field', 'first, second, third');

      expect(ingestResult[1]).toHaveProperty('my_joined_field', 'first, third');
      expect(esqlResult.documentsOrdered[1]).toHaveProperty('my_joined_field', 'first, third');
    }
  );
});
