/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RemoveByPrefixProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - RemoveByPrefix Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should remove sub-fields matching the prefix with DROP', async ({ testBed, esql }) => {
      // Note: ES|QL's DROP field.* requires at least one matching mapped column.
      // This test verifies the basic DROP field.* behaviour with dynamic mapping
      // so that sub-fields are properly mapped and discoverable.
      const indexName = 'stream-e2e-test-remove-by-prefix-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            from: 'temp_field',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Use dynamic mapping so temp_field.child is properly mapped and DROP temp_field.* succeeds.
      const docs = [{ temp_field: { child: 'remove-me' }, message: 'keep-this' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      // temp_field.child should be removed by DROP temp_field.*
      expect(esqlResult.columnNames).not.toContain('temp_field.child');
      // message should be preserved
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ message: 'keep-this' })
      );
    });

    apiTest('should remove nested fields (parent field removed too)', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-remove-by-prefix-nested';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            from: 'host',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

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
      // Use dynamic mapping so host.* sub-fields are properly mapped and DROP host.* succeeds.
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      // The nested fields are removed
      expect(esqlResult.columnNames).not.toContain('host.name');
      expect(esqlResult.columnNames).not.toContain('host.ip');
      expect(esqlResult.columnNames).not.toContain('host.os.platform');
      expect(esqlResult.columnNames).not.toContain('host.os.version');
      // Parent field is also removed when all nested fields are gone
      expect(esqlResult.columnNames).not.toContain('host');
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ message: 'keep-this' })
      );
    });

    apiTest(
      'should work with dotted field names (flattened structure)',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-remove-by-prefix-dotted';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              from: 'labels',
            } as RemoveByPrefixProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [
          {
            'labels.env': 'production',
            'labels.team': 'platform',
            message: 'keep-this',
          },
        ];
        // Use dynamic mapping so labels.* fields are properly mapped and DROP labels.* succeeds.
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(1);
        // Nested fields are removed
        expect(esqlResult.columnNames).not.toContain('labels.env');
        expect(esqlResult.columnNames).not.toContain('labels.team');
        // Parent field is also removed when all nested fields are gone
        expect(esqlResult.columnNames).not.toContain('labels');
        expect(esqlResult.documents[0]).toStrictEqual(
          expect.objectContaining({ message: 'keep-this' })
        );
      }
    );

    apiTest('should reject Mustache template syntax {{ and {{{ in field names', async ({}) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            from: '{{field.name}}',
          } as RemoveByPrefixProcessor,
        ],
      };
      expect(() => transpile(streamlangDSL)).toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
      );
    });
  }
);
