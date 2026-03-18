/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { ConvertProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Convert Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should convert a field to a different type', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-convert-value';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'convert',
            from: 'attributes.size',
            type: 'string',
          } as ConvertProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ attributes: { size: 4096 } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.attributes?.size).toBe('4096');
    });

    // Template syntax validation tests - these should now REJECT Mustache templates
    [
      {
        templateValue: '{{value}}',
        templateTo: '{{templated_to}}',
        templateType: '{{ }}',
        description: 'should reject {{ }} template syntax',
      },
      {
        templateValue: '{{value}}',
        templateTo: 'template_to',
        templateType: '{{ }}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateValue: 'template_value',
        templateTo: '{{templated_to}}',
        templateType: '{{ }}',
        description: 'should reject {{ }} template syntax in values',
      },
      {
        templateValue: '{{{value}}}',
        templateTo: '{{{templated_to}}}',
        templateType: '{{{ }}}',
        description: 'should reject {{{ }}} template syntax',
      },
    ].forEach(({ templateValue, templateTo, templateType, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'convert',
              from: templateValue,
              to: templateTo,
              type: templateType,
            } as ConvertProcessor,
          ],
        };

        expect(() => {
          transpile(streamlangDSL);
        }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed'); // Should throw validation error for Mustache templates
      });
    });

    apiTest(
      'should convert a field to a different type into a the target field',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-convert-value-to-target';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'convert',
              from: 'attributes.size',
              to: 'attributes.size_str',
              type: 'string',
            } as ConvertProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ attributes: { size: 4096 } }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs[0]?.attributes?.size).toBe(4096);
        expect(ingestedDocs[0]?.attributes?.size_str).toBe('4096');
      }
    );

    apiTest(
      'should convert a field to a different type into a the target field with a where condition',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-convert-value-to-target-with-where';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'convert',
              from: 'attributes.size',
              to: 'attributes.size_str',
              type: 'string',
              where: {
                field: 'attributes.size',
                exists: true,
              },
            } as ConvertProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ attributes: { size: 4096 } }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs[0]?.attributes?.size).toBe(4096);
        expect(ingestedDocs[0]?.attributes?.size_str).toBe('4096');
      }
    );
  }
);
