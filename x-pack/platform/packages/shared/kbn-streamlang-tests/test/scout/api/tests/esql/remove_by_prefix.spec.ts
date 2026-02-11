/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RemoveByPrefixProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - RemoveByPrefix Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest(
      'should keep the parent field when it has no nested fields',
      async ({ testBed, esql }) => {
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

        const docs = [{ temp_field: 'to-be-kept', message: 'keep-this' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(1);
        // The parent field itself is not removed, only nested fields would be
        expect(esqlResult.documents[0]?.temp_field).toBeDefined();
        expect(esqlResult.documents[0]).toStrictEqual(
          expect.objectContaining({ message: 'keep-this', temp_field: 'to-be-kept' })
        );
      }
    );

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
