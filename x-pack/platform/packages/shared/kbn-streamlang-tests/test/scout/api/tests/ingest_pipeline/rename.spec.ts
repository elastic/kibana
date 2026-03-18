/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RenameProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Rename Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should rename a field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-rename';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'rename',
            from: 'host.original',
            to: 'host.renamed',
          } as RenameProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ host: { original: 'test-host' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.host?.renamed).toBe('test-host');
      expect(source?.host?.original).toBeUndefined();
    });

    [
      {
        templateFrom: 'host.{{source_field}}',
        templateTo: 'host.{{target_field}}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateFrom: 'host.{{{source_field}}}',
        templateTo: 'host.{{{target_field}}}',
        description: 'should reject {{{ }}} template syntax in field names',
      },
    ].forEach(({ templateFrom, templateTo, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'rename',
              from: templateFrom,
              to: templateTo,
            } as RenameProcessor,
          ],
        };

        expect(() => {
          transpile(streamlangDSL);
        }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed');
      });
    });

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-rename-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'rename',
            from: 'host.original',
            to: 'host.renamed',
            ignore_missing: true,
          } as RenameProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'host.original' field
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.host?.renamed).toBeUndefined();
    });

    apiTest('should fail if field is missing and ignore_missing is false', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-rename-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'rename',
            from: 'host.original',
            to: 'host.renamed',
            ignore_missing: false,
          } as RenameProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'host.original' field
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(JSON.stringify(errors[0].reason)).toContain('host.original');
      expect(errors[0].type).toBe('illegal_argument_exception');
    });

    apiTest('should override existing field when override is true', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-rename-override';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'rename',
            from: 'host.original',
            to: 'host.renamed',
            override: true,
          } as RenameProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ host: { original: 'test-host', renamed: 'old-host' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.host?.renamed).toBe('test-host');
    });

    apiTest('should fail if target field exists and override is false', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-rename-no-override';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'rename',
            from: 'host.original',
            to: 'host.renamed',
            override: false,
          } as RenameProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ host: { original: 'test-host', renamed: 'old-host' } }];
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(JSON.stringify(errors[0].reason)).toContain('host.renamed');
      expect(errors[0].type).toBe('illegal_argument_exception');
    });

    apiTest(
      'default values of ignore_missing and override (ignore_missing: false, override: false)',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-rename-defaults';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'rename',
              from: 'host.original',
              to: 'host.renamed',
            } as RenameProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        // Case 1: Source field missing, should fail (ignore_missing: false)
        const docsMissingSource = [{ host: { renamed: 'old-host' } }];
        const { errors } = await testBed.ingest(indexName, docsMissingSource, processors);
        expect(JSON.stringify(errors[0].reason)).toContain('host.original');
        expect(errors[0].type).toBe('illegal_argument_exception');

        // Case 2: Target field exists, default value of override is false
        await testBed.clean(indexName);
        const docsExistingTarget = [{ host: { original: 'new-host', renamed: 'old-host' } }];
        const { errors: errors2 } = await testBed.ingest(indexName, docsExistingTarget, processors);
        expect(JSON.stringify(errors2[0].reason)).toContain('host.renamed');
        expect(errors2[0].type).toBe('illegal_argument_exception');
      }
    );
  }
);
