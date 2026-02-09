/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { SortProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Sort Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should sort an array field in ascending order (in-place)', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-sort-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
          } as SortProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] })
      );
    });

    apiTest('should sort an array field in descending order', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-sort-desc';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
            order: 'desc',
          } as SortProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ tags: ['charlie', 'bravo', 'alpha'] })
      );
    });

    apiTest('should sort an array field to a target field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-sort-target-field';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
            to: 'sorted_tags',
            order: 'asc',
          } as SortProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({
          tags: ['charlie', 'alpha', 'bravo'], // Original preserved
          sorted_tags: ['alpha', 'bravo', 'charlie'], // New field created
        })
      );
    });

    apiTest('should sort numeric arrays', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-sort-numeric';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'numbers',
            order: 'asc',
          } as SortProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ numbers: [3, 1, 4, 1, 5, 9, 2, 6] }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ numbers: [1, 1, 2, 3, 4, 5, 6, 9] })
      );
    });

    apiTest('should fail if field is missing and ignore_failure is false', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-sort-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'nonexistent',
            ignore_failure: false,
          } as SortProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].reason).toContain('field [nonexistent] not present as part of path');
    });

    apiTest(
      'should not fail if field is missing and ignore_failure is true',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-sort-ignore-failure';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'sort',
              from: 'nonexistent',
              ignore_failure: true,
            } as SortProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0];
        expect(source).toStrictEqual(expect.objectContaining({ message: 'some_value' }));
        expect((source as Record<string, unknown>).nonexistent).toBeUndefined();
      }
    );

    apiTest(
      'should skip processing when field is missing and ignore_missing is true',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-sort-ignore-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'sort',
              from: 'nonexistent',
              ignore_missing: true,
            } as SortProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0];
        expect(source).toStrictEqual(expect.objectContaining({ message: 'some_value' }));
        expect((source as Record<string, unknown>).nonexistent).toBeUndefined();
      }
    );

    apiTest('should process when field exists and ignore_missing is true', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-sort-ignore-missing-exists';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
            ignore_missing: true,
          } as SortProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] })
      );
    });

    apiTest('should sort field conditionally with where condition', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-sort-conditional';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
            order: 'asc',
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as SortProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { tags: ['charlie', 'alpha', 'bravo'], event: { kind: 'test' } },
        { tags: ['zulu', 'xray', 'yankee'], event: { kind: 'production' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);

      // First doc should have tags sorted (where condition matched)
      const doc1 = ingestedDocs.find((d: any) => d.event?.kind === 'test');
      expect(doc1).toStrictEqual(
        expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'], 'event.kind': 'test' })
      );

      // Second doc should keep original order (where condition not matched)
      const doc2 = ingestedDocs.find((d: any) => d.event?.kind === 'production');
      expect(doc2).toStrictEqual(
        expect.objectContaining({ tags: ['zulu', 'xray', 'yankee'], 'event.kind': 'production' })
      );
    });

    apiTest(
      'should sort to target field conditionally with where condition',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-sort-conditional-target';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'sort',
              from: 'tags',
              to: 'sorted_tags',
              order: 'asc',
              where: {
                field: 'event.kind',
                eq: 'test',
              },
            } as SortProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { tags: ['charlie', 'alpha', 'bravo'], event: { kind: 'test' } },
          { tags: ['zulu', 'xray', 'yankee'], event: { kind: 'production' } },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(2);

        // First doc should have sorted_tags created (where condition matched)
        const doc1 = ingestedDocs.find((d: any) => d.event?.kind === 'test');
        expect(doc1).toStrictEqual(
          expect.objectContaining({
            tags: ['charlie', 'alpha', 'bravo'], // Original preserved
            sorted_tags: ['alpha', 'bravo', 'charlie'], // New field created
            'event.kind': 'test',
          })
        );

        // Second doc should not have sorted_tags (where condition not matched)
        const doc2 = ingestedDocs.find((d: any) => d.event?.kind === 'production');
        expect(doc2).toStrictEqual(
          expect.objectContaining({
            tags: ['zulu', 'xray', 'yankee'],
            'event.kind': 'production',
          })
        );
        expect((doc2 as Record<string, unknown>).sorted_tags).toBeUndefined();
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
              action: 'sort',
              from: templateField,
            } as SortProcessor,
          ],
        };

        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      });
    });
  }
);
