/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { RenameProcessor, StreamlangDSL } from '../../../../..';
import { transpile } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Streamlang to ES|QL - Rename Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest('should rename a field', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-rename';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'rename',
            from: 'host.original',
            to: 'host.renamed',
            override: true, // non-default
          } as RenameProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ host: { original: 'test-host' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents[0]).toEqual(
        expect.objectContaining({ 'host.renamed': 'test-host' })
      );
      expect(esqlResult.documents[0]).not.toHaveProperty('host.original');
    });

    streamlangApiTest(
      'should handle ignore_missing: false, override: false (default options)',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-rename-no-override';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'rename',
              from: 'host.original',
              to: 'host.renamed',
            } as RenameProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        // Add `mappingDoc` to address ES|QL limitation that any column used as operand must be available as a column (pre-mapped)
        const mappingDoc = { host: { original: 'new-host-0', renamed: 'old-host-0' } };
        const docWithMissingSource = { host: { renamed: 'old-host-1' } };
        const docWithMissingTarget = { host: { original: 'new-host-2' } };
        const docWithMissingFields = { message: 'message-3' };
        const docs = [mappingDoc, docWithMissingSource, docWithMissingTarget, docWithMissingFields];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.columnNames).not.toContain('host.original'); // Should have been dropped/renamed
        expect(esqlResult.documents[0]['host.renamed']).toEqual('old-host-0'); // Should not override (override is false)
        expect(esqlResult.documents[1]['host.renamed']).toEqual('old-host-1'); // Should not override (override is false)
        expect(esqlResult.documents[2]['host.renamed']).toEqual('new-host-2'); // Should rename as host.original existed
        expect(esqlResult.documents[3]['host.renamed']).toBeNull(); // ES|QL design that column can't be non-existent
      }
    );

    streamlangApiTest(
      'should handle ignore_missing: true, override: false',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-rename-ignore-missing-no-override';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'rename',
              from: 'host.original',
              to: 'host.renamed',
              ignore_missing: true,
              override: false,
            } as RenameProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docWithFields = { host: { original: 'new-host-0', renamed: 'old-host-0' } };
        const docWithMissingSource = { host: { renamed: 'old-host-1' } };
        const docWithMissingTarget = { host: { original: 'new-host-2' } };
        const docWithMissingFields = {};
        const docs = [
          docWithFields,
          docWithMissingSource,
          docWithMissingTarget,
          docWithMissingFields,
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.columnNames).not.toContain('host.original'); // Should have been dropped/renamed
        expect(esqlResult.documents[0]['host.renamed']).toEqual('old-host-0'); // Should not override (override is false)
        expect(esqlResult.documents[1]['host.renamed']).toEqual('old-host-1'); // Should not override (override is false)
        expect(esqlResult.documents[2]['host.renamed']).toEqual('new-host-2'); // Should rename as host.original existed
        expect(esqlResult.documents[3]['host.renamed']).toBeNull(); // ignore_missing is true and source field is missing
      }
    );

    streamlangApiTest(
      'should handle ignore_missing: false, override: true',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-rename-fail-missing-override';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'rename',
              from: 'host.original',
              to: 'host.renamed',
              ignore_missing: false,
              override: true,
            } as RenameProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docWithFields = { host: { original: 'test-host', renamed: 'old-host' } };
        const docWithMissingSource = { host: { renamed: 'old-value' } };
        const docWithMissingTarget = { host: { original: 'new-host' } };
        const docWithMissingFields = { message: 'some_value' };
        const docs = [
          docWithFields,
          docWithMissingSource,
          docWithMissingTarget,
          docWithMissingFields,
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.columnNames).not.toContain('host.original'); // Should have been dropped/renamed
        expect(esqlResult.documents[0]['host.renamed']).toEqual('test-host'); // Should override old value
        expect(esqlResult.documents[1]['host.renamed']).toBeNull(); // override is true but ignore_missing is false
        expect(esqlResult.documents[2]['host.renamed']).toEqual('new-host'); // Should rename as host.original existed
        expect(esqlResult.documents[3]['host.renamed']).toBeNull(); // override is true but ignore_missing is false
      }
    );

    streamlangApiTest(
      'should reject Mustache template syntax {{ and {{{ in field names',
      async ({ testBed, esql }) => {
        expect(() => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'rename',
                from: '{{source.field}}',
                to: '{{{target.field}}}',
                override: true,
              } as RenameProcessor,
            ],
          };
          transpile(streamlangDSL);
        }).toThrow(); // Should throw validation error for Mustache templates
      }
    );
  }
);
