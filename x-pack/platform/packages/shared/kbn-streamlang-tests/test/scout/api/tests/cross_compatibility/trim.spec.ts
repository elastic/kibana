/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { StreamlangDSL, TrimProcessor } from '@kbn/streamlang';
import { transpileEsql, transpileIngestPipeline } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Trim Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest('should trim a field in both ingest pipeline and ES|QL', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'trim',
          from: 'message',
        } as TrimProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      {
        message: '   test message 1   ',
      },
      {
        message: '   test message 2   ',
      },
    ];

    await testBed.ingest('ingest-e2e-test-trim-basic', docs, processors);
    const ingestResult = await testBed.getDocs('ingest-e2e-test-trim-basic');

    await testBed.ingest('esql-e2e-test-trim-basic', docs);
    const esqlResult = await esql.queryOnIndex('esql-e2e-test-trim-basic', query);

    expect(ingestResult).toHaveLength(2);
    expect(ingestResult[0]?.message).toBe('test message 1');
    expect(ingestResult[1]?.message).toBe('test message 2');

    expect(esqlResult.documents).toHaveLength(2);
    expect(esqlResult.documents[0]?.message).toBe('test message 1');
    expect(esqlResult.documents[1]?.message).toBe('test message 2');
  });

  apiTest('should trim a field into a target field', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'trim',
          from: 'message',
          to: 'message_trimmed',
        } as TrimProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ message: '   test message 1   ' }, { message: '   test message 2   ' }];
    await testBed.ingest('ingest-e2e-test-trim-basic', docs, processors);
    const ingestResult = await testBed.getDocs('ingest-e2e-test-trim-basic');

    await testBed.ingest('esql-e2e-test-trim-basic', docs);
    const esqlResult = await esql.queryOnIndex('esql-e2e-test-trim-basic', query);

    expect(ingestResult).toHaveLength(2);
    expect(ingestResult[0]?.message_trimmed).toBe('test message 1');
    expect(ingestResult[1]?.message_trimmed).toBe('test message 2');

    expect(esqlResult.documents).toHaveLength(2);
    expect(esqlResult.documents[0]?.message_trimmed).toBe('test message 1');
    expect(esqlResult.documents[1]?.message_trimmed).toBe('test message 2');
  });

  apiTest('should trim a field with a where condition', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'trim',
          from: 'message',
          where: {
            field: 'should_trim',
            eq: 'yes',
          },
        } as TrimProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      { message: '   test message 1   ', should_trim: 'yes' },
      { message: '   test message 2   ', should_trim: 'no' },
    ];
    await testBed.ingest('ingest-e2e-test-trim-basic', docs, processors);
    const ingestResult = await testBed.getDocs('ingest-e2e-test-trim-basic');

    await testBed.ingest('esql-e2e-test-trim-basic', docs);
    const esqlResult = await esql.queryOnIndex('esql-e2e-test-trim-basic', query);

    expect(ingestResult).toHaveLength(2);
    expect(ingestResult[0]?.message).toBe('test message 1');
    expect(ingestResult[1]?.message).toBe('   test message 2   ');

    expect(esqlResult.documents).toHaveLength(2);
    expect(esqlResult.documents[0]?.message).toBe('test message 1');
    expect(esqlResult.documents[1]?.message).toBe('   test message 2   ');
  });
});
