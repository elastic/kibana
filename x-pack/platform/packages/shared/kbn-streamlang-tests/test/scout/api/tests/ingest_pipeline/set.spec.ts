/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Set Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should set a field using a value', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-set-value';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.status',
            value: 'active',
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ attributes: { size: 4096 } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.attributes?.status).toBe('active');
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
    ].forEach(({ templateValue, templateTo, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: templateTo,
              value: templateValue,
            } as SetProcessor,
          ],
        };

        expect(() => {
          transpile(streamlangDSL);
        }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed'); // Should throw validation error for Mustache templates
      });
    });

    apiTest('should set a field by copying from another field', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-set-copy';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.status',
            copy_from: 'message',
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'should-be-copied' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.attributes?.status).toBe('should-be-copied');
    });

    apiTest('should not override an existing field when override is false', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-set-no-override';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.status',
            value: 'inactive',
            override: false,
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ attributes: { status: 'active' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.attributes?.status).toBe('active');
    });

    apiTest('should override an existing field when override is true', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-set-override';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.status',
            value: 'inactive',
            override: true,
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ attributes: { status: 'active' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.attributes?.status).toBe('inactive');
    });

    apiTest('should throw error if value and copy_from are missing', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.status',
          } as SetProcessor,
        ],
      };

      expect(() => transpile(streamlangDSL)).toThrowError(
        JSON.stringify(
          [
            {
              code: 'custom',
              message: 'Set processor must have either value or copy_from, but not both.',
              path: ['steps', 0, 'value', 'copy_from'],
            },
          ],
          null,
          2
        )
      );
    });

    apiTest('should throw error if value and copy_from are both present', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.status',
            value: 'active',
            copy_from: 'message',
          } as SetProcessor,
        ],
      };

      expect(() => transpile(streamlangDSL)).toThrowError(
        JSON.stringify(
          [
            {
              code: 'custom',
              message: 'Set processor must have either value or copy_from, but not both.',
              path: ['steps', 0, 'value', 'copy_from'],
            },
          ],
          null,
          2
        )
      );
    });
  }
);
