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
        const docWithMissingTarget = { host: { original: 'new-host-2' } }; // Should only pass through filter
        const docWithMissingFields = { message: 'message-3' };
        const docs = [mappingDoc, docWithMissingSource, docWithMissingTarget, docWithMissingFields];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // ES|QL filters out documents failing the ignore_missing and override checks
        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.columnNames).not.toContain('host.original'); // Should have been dropped/renamed
        expect(esqlResult.documents[0]['host.renamed']).toEqual('new-host-2'); // Should rename as host.original existed
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
        const docWithMissingTarget = { host: { original: 'new-host-2' } }; // Should pass through filter
        const docWithMissingFields = { host: {} }; // Should pass through filter
        const docs = [
          docWithFields,
          docWithMissingSource,
          docWithMissingTarget,
          docWithMissingFields,
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.columnNames).not.toContain('host.original'); // Should have been dropped/renamed
        expect(esqlResult.documents[0]['host.renamed']).toEqual('new-host-2'); // renamed
        expect(esqlResult.documents[1]['host.renamed']).toBeNull(); // source field is missing
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
        const docWithMissingSource = { host: { renamed: 'old-value' } }; // should be dropped
        const docWithMissingTarget = { host: { original: 'new-host' } }; // Should rename as host.original exists
        const docWithMissingFields = { message: 'some_value' }; // should be dropped
        const docs = [
          docWithFields,
          docWithMissingSource,
          docWithMissingTarget,
          docWithMissingFields,
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.columnNames).not.toContain('host.original'); // Should have been dropped/renamed
        expect(esqlResult.documents[1]['host.renamed']).toEqual('new-host'); // Should rename as host.original exists
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
