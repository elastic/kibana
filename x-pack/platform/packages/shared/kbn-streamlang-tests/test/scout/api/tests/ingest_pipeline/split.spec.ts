/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { SplitProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Split Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should split a string field into an array (in-place)', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-split-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            separator: ',',
          } as SplitProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ tags: 'foo,bar,baz' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ tags: ['foo', 'bar', 'baz'] })
      );
    });

    apiTest('should split a string field to a target field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-split-target-field';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            to: 'tags_array',
            separator: ',',
          } as SplitProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ tags: 'foo,bar,baz' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({
          tags: 'foo,bar,baz', // Original preserved
          tags_array: ['foo', 'bar', 'baz'], // New field created
        })
      );
    });

    apiTest('should split using regex pattern', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-split-regex';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'message',
            separator: '\\s+', // Match one or more whitespace characters
          } as SplitProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'hello   world  test' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ message: ['hello', 'world', 'test'] })
      );
    });

    apiTest('should fail if field is missing and ignore_missing is false', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-split-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'nonexistent',
            separator: ',',
            ignore_missing: false,
          } as SplitProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].reason).toContain('field [nonexistent] not present as part of path');
    });

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-split-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'nonexistent',
            separator: ',',
            ignore_missing: true,
          } as SplitProcessor,
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
    });

    apiTest(
      'should preserve trailing empty elements when preserve_trailing is true',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-split-trailing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'split',
              from: 'tags',
              separator: ',',
              preserve_trailing: true,
            } as SplitProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ tags: 'A,,B,,' }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        expect(ingestedDocs[0]).toStrictEqual(
          expect.objectContaining({ tags: ['A', '', 'B', '', ''] })
        );
      }
    );

    apiTest(
      'should discard trailing empty elements when preserve_trailing is false',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-split-no-trailing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'split',
              from: 'tags',
              separator: ',',
              preserve_trailing: false,
            } as SplitProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ tags: 'A,,B,,' }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        expect(ingestedDocs[0]).toStrictEqual(expect.objectContaining({ tags: ['A', '', 'B'] }));
      }
    );

    apiTest('should split field conditionally with where condition', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-split-conditional';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            separator: ',',
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as SplitProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { tags: 'foo,bar,baz', event: { kind: 'test' } },
        { tags: 'one,two,three', event: { kind: 'production' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);

      // First doc should have tags split (where condition matched)
      const doc1 = ingestedDocs.find((d: any) => d.event?.kind === 'test');
      expect(doc1).toStrictEqual(
        expect.objectContaining({ tags: ['foo', 'bar', 'baz'], 'event.kind': 'test' })
      );

      // Second doc should keep original tags (where condition not matched)
      const doc2 = ingestedDocs.find((d: any) => d.event?.kind === 'production');
      expect(doc2).toStrictEqual(
        expect.objectContaining({ tags: 'one,two,three', 'event.kind': 'production' })
      );
    });

    apiTest(
      'should split to target field conditionally with where condition',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-split-conditional-target';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'split',
              from: 'tags',
              to: 'tags_array',
              separator: ',',
              where: {
                field: 'event.kind',
                eq: 'test',
              },
            } as SplitProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { tags: 'foo,bar,baz', event: { kind: 'test' } },
          { tags: 'one,two,three', event: { kind: 'production' } },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(2);

        // First doc should have tags_array created (where condition matched)
        const doc1 = ingestedDocs.find((d: any) => d.event?.kind === 'test');
        expect(doc1).toStrictEqual(
          expect.objectContaining({
            tags: 'foo,bar,baz', // Original preserved
            tags_array: ['foo', 'bar', 'baz'], // New field created
            'event.kind': 'test',
          })
        );

        // Second doc should not have tags_array (where condition not matched)
        const doc2 = ingestedDocs.find((d: any) => d.event?.kind === 'production');
        expect(doc2).toStrictEqual(
          expect.objectContaining({
            tags: 'one,two,three',
            'event.kind': 'production',
          })
        );
        expect((doc2 as Record<string, unknown>).tags_array).toBeUndefined();
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
              action: 'split',
              from: templateField,
              separator: ',',
            } as SplitProcessor,
          ],
        };

        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      });
    });
  }
);
