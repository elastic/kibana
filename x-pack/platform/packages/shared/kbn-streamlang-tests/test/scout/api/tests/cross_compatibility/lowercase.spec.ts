/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { LowercaseProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql, transpileIngestPipeline } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Lowercase Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest(
    'should lowercase a field in both ingest pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'lowercase',
            from: 'message',
          } as LowercaseProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          message: 'TEST MESSAGE 1',
        },
        {
          message: 'TEST MESSAGE 2',
        },
      ];

      await testBed.ingest('ingest-e2e-test-lowercase-basic', docs, processors);
      const ingestResult = await testBed.getDocs('ingest-e2e-test-lowercase-basic');

      await testBed.ingest('esql-e2e-test-lowercase-basic', docs);
      const esqlResult = await esql.queryOnIndex('esql-e2e-test-lowercase-basic', query);

      expect(ingestResult).toHaveLength(2);
      expect(ingestResult[0]?.message).toBe('test message 1');
      expect(ingestResult[1]?.message).toBe('test message 2');

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message).toBe('test message 1');
      expect(esqlResult.documents[1]?.message).toBe('test message 2');
    }
  );

  apiTest('should lowercase a field into a target field', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'lowercase',
          from: 'message',
          to: 'message_lowercase',
        } as LowercaseProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ message: 'TEST MESSAGE 1' }, { message: 'TEST MESSAGE 2' }];
    await testBed.ingest('ingest-e2e-test-lowercase-basic', docs, processors);
    const ingestResult = await testBed.getDocs('ingest-e2e-test-lowercase-basic');

    await testBed.ingest('esql-e2e-test-lowercase-basic', docs);
    const esqlResult = await esql.queryOnIndex('esql-e2e-test-lowercase-basic', query);

    expect(ingestResult).toHaveLength(2);
    expect(ingestResult[0]?.message_lowercase).toBe('test message 1');
    expect(ingestResult[1]?.message_lowercase).toBe('test message 2');

    expect(esqlResult.documents).toHaveLength(2);
    expect(esqlResult.documents[0]?.message_lowercase).toBe('test message 1');
    expect(esqlResult.documents[1]?.message_lowercase).toBe('test message 2');
  });

  apiTest('should lowercase a field with a where condition', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'lowercase',
          from: 'message',
          where: {
            field: 'should_lowercase',
            eq: 'yes',
          },
        } as LowercaseProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      { message: 'TEST MESSAGE 1', should_lowercase: 'yes' },
      { message: 'TEST MESSAGE 2', should_lowercase: 'no' },
    ];
    await testBed.ingest('ingest-e2e-test-lowercase-basic', docs, processors);
    const ingestResult = await testBed.getDocs('ingest-e2e-test-lowercase-basic');

    await testBed.ingest('esql-e2e-test-lowercase-basic', docs);
    const esqlResult = await esql.queryOnIndex('esql-e2e-test-lowercase-basic', query);

    expect(ingestResult).toHaveLength(2);
    expect(ingestResult[0]?.message).toBe('test message 1');
    expect(ingestResult[1]?.message).toBe('TEST MESSAGE 2');

    expect(esqlResult.documents).toHaveLength(2);
    expect(esqlResult.documents[0]?.message).toBe('test message 1');
    expect(esqlResult.documents[1]?.message).toBe('TEST MESSAGE 2');
  });
});
