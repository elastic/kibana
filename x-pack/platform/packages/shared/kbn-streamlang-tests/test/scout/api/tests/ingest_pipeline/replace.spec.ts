/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { ReplaceProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Replace Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should replace a literal string (in-place)', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-replace-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: 'error',
            replacement: 'warning',
          } as ReplaceProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'An error occurred' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.message).toBe('An warning occurred');
    });

    apiTest('should replace a literal string to target field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-replace-target-field';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            to: 'clean_message',
            pattern: 'error',
            replacement: 'warning',
          } as ReplaceProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'An error occurred' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.message).toBe('An error occurred'); // Original preserved
      expect(ingestedDocs[0]?.clean_message).toBe('An warning occurred'); // New field created
    });

    apiTest('should replace using regex pattern', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-replace-regex';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: '\\d{3}',
            replacement: '[NUM]',
          } as ReplaceProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'Error code 404 found' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.message).toBe('Error code [NUM] found');
    });

    apiTest('should replace using regex with capture groups', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-replace-capture-groups';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: 'User (\\w+) has (\\d+) new (messages?)',
            replacement: 'Messages: $2 for user $1',
          } as ReplaceProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'User alice has 3 new messages' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.message).toBe('Messages: 3 for user alice');
    });

    apiTest(
      'should fail if field is missing (default value) and ignore_missing is false',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-replace-fail-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'nonexistent',
              pattern: 'error',
              replacement: 'warning',
            } as ReplaceProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
        const { errors } = await testBed.ingest(indexName, docs, processors);
        expect(errors).toHaveLength(1);
        expect(errors[0].type).toBe('illegal_argument_exception');
      }
    );

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-replace-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'nonexistent',
            pattern: 'error',
            replacement: 'warning',
            ignore_missing: true,
          } as ReplaceProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.message).toBe('some_value');
      expect(source?.nonexistent).toBeUndefined();
    });

    apiTest('should replace field conditionally with where condition', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-replace-conditional';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: 'error',
            replacement: 'warning',
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as ReplaceProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { message: 'An error occurred', event: { kind: 'test' } },
        { message: 'An error occurred', event: { kind: 'production' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);

      // First doc should have message replaced (where condition matched)
      const doc1 = ingestedDocs.find((d: any) => d.event?.kind === 'test');
      expect(doc1?.message).toBe('An warning occurred');
      expect(doc1?.event?.kind).toBe('test');

      // Second doc should keep original message (where condition not matched)
      const doc2 = ingestedDocs.find((d: any) => d.event?.kind === 'production');
      expect(doc2?.message).toBe('An error occurred');
      expect(doc2?.event?.kind).toBe('production');
    });

    apiTest(
      'should replace to target field conditionally with where condition',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-replace-conditional-target';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'message',
              to: 'clean_message',
              pattern: 'error',
              replacement: 'warning',
              where: {
                field: 'event.kind',
                eq: 'test',
              },
            } as ReplaceProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { message: 'An error occurred', event: { kind: 'test' } },
          { message: 'An error occurred', event: { kind: 'production' } },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(2);

        // First doc should have clean_message created (where condition matched)
        const doc1 = ingestedDocs.find((d: any) => d.event?.kind === 'test');
        expect(doc1?.message).toBe('An error occurred'); // Original preserved
        expect(doc1?.clean_message).toBe('An warning occurred'); // New field created
        expect(doc1?.event?.kind).toBe('test');

        // Second doc should not have clean_message (where condition not matched)
        const doc2 = ingestedDocs.find((d: any) => d.event?.kind === 'production');
        expect(doc2?.message).toBe('An error occurred');
        expect(doc2?.clean_message).toBeUndefined();
        expect(doc2?.event?.kind).toBe('production');
      }
    );

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
              action: 'replace',
              from: templateField,
              pattern: 'error',
              replacement: 'warning',
            } as ReplaceProcessor,
          ],
        };

        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      });
    });
  }
);
