/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { DropDocumentProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql, transpileIngestPipeline } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Drop Document Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest(
      'should drop documents matching where condition in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'drop_document',
              where: {
                field: 'logType',
                eq: 'info',
              },
            } as DropDocumentProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          {
            logType: 'info',
            message: 'drop-this',
          },
          {
            logType: 'info',
            message: 'drop-this',
          },
          {
            logType: 'critical',
            message: 'keep-this',
          },
          {
            logType: 'critical',
            message: 'keep-this',
          },
        ];

        await testBed.ingest('ingest-e2e-test-drop-basic', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-e2e-test-drop-basic');

        await testBed.ingest('esql-e2e-test-drop-basic', docs);
        const esqlResult = await esql.queryOnIndex('esql-e2e-test-drop-basic', query);

        expect(ingestResult).toHaveLength(2);
        ingestResult.forEach((remainingDoc) => expect(remainingDoc?.logType).not.toBe('info'));

        expect(esqlResult.documents).toHaveLength(2);
        esqlResult.documents.forEach((remainingDoc) =>
          expect(remainingDoc?.logType).not.toBe('info')
        );
      }
    );

    apiTest('should raise a runtime error when where is omitted', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'drop_document',
          } as DropDocumentProcessor,
        ],
      };

      // Both transpilers should throw validation errors with no where clause
      expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
        'where clause is required in drop_document.'
      );
      expect(() => transpileEsql(streamlangDSL)).toThrow(
        'where clause is required in drop_document.'
      );
    });
  }
);
