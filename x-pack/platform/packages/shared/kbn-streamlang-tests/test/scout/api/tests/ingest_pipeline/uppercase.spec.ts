/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { StreamlangDSL, UppercaseProcessor } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Uppercase Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should uppercase a field in place', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-uppercase-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uppercase',
            from: 'message',
          } as UppercaseProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'test message 1' }, { message: 'test message 2' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);
      expect(ingestedDocs[0]?.message).toBe('TEST MESSAGE 1');
      expect(ingestedDocs[1]?.message).toBe('TEST MESSAGE 2');
    });

    apiTest('should uppercase a field into a target field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-uppercase-to-target';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uppercase',
            from: 'message',
            to: 'message_upper',
          } as UppercaseProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'test message 1' }, { message: 'test message 2' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);
      expect(ingestedDocs[0]?.message_upper).toBe('TEST MESSAGE 1');
      expect(ingestedDocs[1]?.message_upper).toBe('TEST MESSAGE 2');
    });

    apiTest(
      'should uppercase a field into a target field with a where condition',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-uppercase-to-target-with-where';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uppercase',
              from: 'message',
              where: {
                field: 'should_uppercase',
                eq: 'yes',
              },
            } as UppercaseProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { message: 'test message 1', should_uppercase: 'yes' },
          { message: 'test message 2', should_uppercase: 'no' }, // this document should not be uppercase
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(2);
        expect(ingestedDocs[0]?.message).toBe('TEST MESSAGE 1');
        expect(ingestedDocs[1]?.message).toBe('test message 2');
      }
    );

    apiTest('should throw an error if the field is not a string', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-uppercase-not-string';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uppercase',
            from: 'id',
          } as UppercaseProcessor,
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
