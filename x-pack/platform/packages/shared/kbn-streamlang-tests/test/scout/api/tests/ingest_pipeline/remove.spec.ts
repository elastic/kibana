/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RemoveProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Remove Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should remove a field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'temp_field',
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ temp_field: 'to-be-removed', message: 'keep-this' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.temp_field).toBeUndefined();
      expect(source?.message).toBe('keep-this');
    });

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'nonexistent',
            ignore_missing: true,
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.message).toBe('some_value');
    });

    apiTest('should fail if field is missing and ignore_missing is false', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'nonexistent',
            ignore_missing: false,
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('illegal_argument_exception');
    });

    apiTest('should remove field conditionally with where condition', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-conditional';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'temp_data',
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { temp_data: { value: 'remove-me' }, event: { kind: 'test' }, message: 'doc1' },
        { temp_data: { value: 'keep-me' }, event: { kind: 'production' }, message: 'doc2' },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);

      // First doc should have temp_data removed (where condition matched)
      const doc1 = ingestedDocs.find((d: any) => d.message === 'doc1');
      expect(doc1?.temp_data).toBeUndefined();
      expect(doc1?.event?.kind).toBe('test');

      // Second doc should keep temp_data (where condition not matched)
      const doc2 = ingestedDocs.find((d: any) => d.message === 'doc2');
      expect(doc2?.temp_data?.value).toBe('keep-me');
      expect(doc2?.event?.kind).toBe('production');
    });

    apiTest('default value of ignore_missing (false)', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-defaults';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'nonexistent',
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      // Field missing, should fail (ignore_missing defaults to false)
      const docs = [{ message: 'some_value' }];
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('illegal_argument_exception');
    });

    [
      {
        templateField: 'host.{{field_name}}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateField: 'host.{{{field_name}}}',
        description: 'should reject {{{ }}} template syntax in field names',
      },
    ].forEach(({ templateField, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove',
              from: templateField,
            } as RemoveProcessor,
          ],
        };

        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      });
    });
  }
);
