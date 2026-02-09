/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { StreamlangDSL, TrimProcessor } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Trim Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should trim a field in place', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-trim-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'trim',
            from: 'message',
          } as TrimProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '   test message 1   ' }, { message: '   test message 2   ' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);
      expect(ingestedDocs[0]?.message).toBe('test message 1');
      expect(ingestedDocs[1]?.message).toBe('test message 2');
    });

    apiTest('should trim a field into a target field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-trim-to-target';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'trim',
            from: 'message',
            to: 'message_trimmed',
          } as TrimProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '   test message 1   ' }, { message: '   test message 2   ' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);
      expect(ingestedDocs[0]?.message_trimmed).toBe('test message 1');
      expect(ingestedDocs[1]?.message_trimmed).toBe('test message 2');
    });

    apiTest(
      'should trim a field into a target field with a where condition',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-trim-to-target-with-where';

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

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { message: '   test message 1   ', should_trim: 'yes' },
          { message: '   test message 2   ', should_trim: 'no' },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(2);
        expect(ingestedDocs[0]?.message).toBe('test message 1');
        expect(ingestedDocs[1]?.message).toBe('   test message 2   ');
      }
    );

    apiTest('should throw an error if the field is not a string', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-trim-not-string';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'trim',
            from: 'id',
          } as TrimProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ id: 1234 }];
      const { errors } = await testBed.ingest(indexName, docs, processors);

      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('illegal_argument_exception');
      expect(errors[0].reason).toBe(
        'field [id] of type [java.lang.Integer] cannot be cast to [java.lang.String]'
      );
    });
  }
);
