/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { RemoveByPrefixProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - RemoveByPrefix Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should remove a field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'temp_field',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ temp_field: 'to-be-removed', message: 'keep-this' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source).not.toHaveProperty('temp_field');
      expect(source).toHaveProperty('message', 'keep-this');
    });

    apiTest('should remove a field and all nested fields (subobjects)', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-nested';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'host',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          host: {
            name: 'server01',
            ip: '192.168.1.1',
            os: {
              platform: 'linux',
              version: '20.04',
            },
          },
          message: 'keep-this',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source).not.toHaveProperty('host');
      expect(source).not.toHaveProperty('host.name');
      expect(source).not.toHaveProperty('host.ip');
      expect(source).not.toHaveProperty('host.os');
      expect(source).not.toHaveProperty('host.os.platform');
      expect(source).not.toHaveProperty('host.os.version');
      expect(source).toHaveProperty('message', 'keep-this');
    });

    apiTest('should remove flattened fields with prefix', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-flattened';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'labels',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      // Create docs with flattened field structure
      const docs = [
        {
          'labels.env': 'production',
          'labels.team': 'platform',
          'labels.version': '1.0',
          message: 'keep-this',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source).not.toHaveProperty('labels');
      expect(source).not.toHaveProperty('labels.env');
      expect(source).not.toHaveProperty('labels.team');
      expect(source).not.toHaveProperty('labels.version');
      expect(source).toHaveProperty('message', 'keep-this');
    });

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'nonexistent',
            ignore_missing: true,
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source).toHaveProperty('message', 'some_value');
    });

    apiTest('should fail if field is missing and ignore_missing is false', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'nonexistent',
            ignore_missing: false,
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('script_exception');
    });

    apiTest('should work with DSL where blocks for conditional removal', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-where-block';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            where: {
              field: 'event.kind',
              eq: 'test',
              steps: [
                {
                  action: 'remove_by_prefix',
                  field: 'temp_data',
                } as RemoveByPrefixProcessor,
              ],
            },
          },
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
      expect(doc1).not.toHaveProperty('temp_data');
      expect(doc1).toHaveProperty('event.kind', 'test');

      // Second doc should keep temp_data (where condition not matched)
      const doc2 = ingestedDocs.find((d: any) => d.message === 'doc2');
      expect(doc2).toHaveProperty('temp_data.value', 'keep-me');
      expect(doc2).toHaveProperty('event.kind', 'production');
    });

    apiTest('default value of ignore_missing (false)', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-defaults';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'nonexistent',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      // Field missing, should fail (ignore_missing defaults to false)
      const docs = [{ message: 'some_value' }];
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('script_exception');
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
      apiTest(`${description}`, async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              field: templateField,
            } as RemoveByPrefixProcessor,
          ],
        };

        expect(() => {
          transpile(streamlangDSL);
        }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed');
      });
    });
  }
);
