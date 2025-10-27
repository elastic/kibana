/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { RemoveProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Remove Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest('should remove a field unconditionally', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'remove',
          from: 'temp_field',
        } as RemoveProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ temp_field: 'to-be-removed', message: 'keep-this' }];
    await testBed.ingest('ingest-remove-basic', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-remove-basic');

    await testBed.ingest('esql-remove-basic', docs);
    const esqlResult = await esql.queryOnIndex('esql-remove-basic', query);

    expect(ingestResult[0]).not.toHaveProperty('temp_field');
    expect(esqlResult.documentsOrdered[0]).not.toHaveProperty('temp_field');

    // Both results should be same
    expect(ingestResult).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered);
  });

  apiTest('should remove field conditionally', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'remove',
          from: 'temp_data',
          where: {
            field: 'event.kind',
            eq: 'test',
          },
        } as RemoveProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      { temp_data: 'remove-me', event: { kind: 'test' }, message: 'doc1' },
      { temp_data: 'keep-me', event: { kind: 'production' }, message: 'doc2' },
    ];

    await testBed.ingest('ingest-remove-conditional', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-remove-conditional');

    await testBed.ingest('esql-remove-conditional', docs);
    const esqlResult = await esql.queryOnIndex('esql-remove-conditional', query);

    // First doc should have temp_data removed (where condition matched)
    expect(ingestResult[0]).not.toHaveProperty('temp_data');
    expect(ingestResult[0]).toHaveProperty('event.kind', 'test');

    // Second doc should keep temp_data (where condition not matched)
    expect(ingestResult[1]).toHaveProperty('temp_data', 'keep-me');
    expect(ingestResult[1]).toHaveProperty('event.kind', 'production');

    // ES|QL results should match (though null vs missing may differ)
    expect(esqlResult.documentsOrdered[0]).toHaveProperty('event.kind', 'test');
    expect(esqlResult.documentsOrdered[1]).toHaveProperty('temp_data', 'keep-me');
    expect(esqlResult.documentsOrdered[1]).toHaveProperty('event.kind', 'production');
  });

  apiTest(
    'should handle ignore_missing: false (default) - filters out docs with missing field',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'temp_field',
            ignore_missing: false,
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        { temp_field: 'to-be-removed', message: 'doc1' },
        { message: 'doc2' }, // Missing temp_field
      ];

      await testBed.ingest('ingest-remove-no-ignore-missing', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-remove-no-ignore-missing');

      await testBed.ingest('esql-remove-no-ignore-missing', docs);
      const esqlResult = await esql.queryOnIndex('esql-remove-no-ignore-missing', query);

      // Both should only have doc1 (doc2 filtered out due to missing field)
      expect(ingestResult).toHaveLength(1);
      expect(ingestResult[0]).toHaveProperty('message', 'doc1');
      expect(ingestResult[0]).not.toHaveProperty('temp_field');

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documentsOrdered[0]).toHaveProperty('message', 'doc1');
      expect(esqlResult.documentsOrdered[0]).not.toHaveProperty('temp_field');

      // Both results should be same
      expect(ingestResult).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered);
    }
  );

  apiTest(
    'should handle ignore_missing: true - passes through docs with missing field',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'temp_field',
            ignore_missing: true,
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        { temp_field: 'to-be-removed', message: 'doc1' },
        { message: 'doc2' }, // Missing temp_field
      ];

      await testBed.ingest('ingest-remove-ignore-missing', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-remove-ignore-missing');

      await testBed.ingest('esql-remove-ignore-missing', docs);
      const esqlResult = await esql.queryOnIndex('esql-remove-ignore-missing', query);

      // Both should have both documents
      expect(ingestResult).toHaveLength(2);
      expect(ingestResult[0]).toHaveProperty('message', 'doc1');
      expect(ingestResult[0]).not.toHaveProperty('temp_field');
      expect(ingestResult[1]).toHaveProperty('message', 'doc2');
      expect(ingestResult[1]).not.toHaveProperty('temp_field');

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documentsOrdered[0]).toHaveProperty('message', 'doc1');
      expect(esqlResult.documentsOrdered[0]).not.toHaveProperty('temp_field');
      expect(esqlResult.documentsOrdered[1]).toHaveProperty('message', 'doc2');
      expect(esqlResult.documentsOrdered[1]).not.toHaveProperty('temp_field');

      // Both results should be same
      expect(ingestResult).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered);
    }
  );

  apiTest(
    'should remove nested fields with by_prefix (ingest vs esql behavior may differ)',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'host',
            by_prefix: true,
            ignore_missing: true,
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          host: {
            name: 'server01',
            ip: '192.168.1.1',
          },
          message: 'keep-this',
        },
      ];

      await testBed.ingest('ingest-remove-by-prefix', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-remove-by-prefix');

      await testBed.ingest('esql-remove-by-prefix', docs);
      const esqlResult = await esql.queryOnIndex('esql-remove-by-prefix', query);

      // Ingest: Removes both 'host' field and all nested fields
      expect(ingestResult[0]).not.toHaveProperty('host');
      expect(ingestResult[0]).not.toHaveProperty('host.name');
      expect(ingestResult[0]).not.toHaveProperty('host.ip');
      expect(ingestResult[0]).toHaveProperty('message', 'keep-this');

      // ESQL: Currently only removes nested fields (host.*)
      // The parent 'host' field may remain as empty object
      expect(esqlResult.columnNames).not.toContain('host.name');
      expect(esqlResult.columnNames).not.toContain('host.ip');
      expect(esqlResult.documentsOrdered[0]).toHaveProperty('message', 'keep-this');

      // NOTE: This is a known difference in behavior between ingest and ESQL
      // Ingest removes the parent field, ESQL only removes nested fields
    }
  );

  apiTest(
    'should fail when by_prefix field does not exist and ignore_missing is false',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'nonexistent',
            by_prefix: true,
            ignore_missing: false,
          } as RemoveProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'doc without nonexistent field' }];

      // Ingest: Should fail/filter out docs where field doesn't exist
      await testBed.ingest('ingest-remove-by-prefix-fail', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-remove-by-prefix-fail');
      expect(ingestResult).toHaveLength(0); // Document should fail processing

      // ESQL: Should also filter out the document
      await testBed.ingest('esql-remove-by-prefix-fail', docs);
      const esqlResult = await esql.queryOnIndex('esql-remove-by-prefix-fail', query);
      expect(esqlResult.documents).toHaveLength(0);
    }
  );

  // Template validation tests - both transpilers should consistently REJECT Mustache templates
  [
    {
      templateType: '{{ }}',
      from: '{{template_from}}',
    },
    {
      templateType: '{{{ }}}',
      from: '{{{template_from}}}',
    },
  ].forEach(({ templateType, from }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove',
              from,
            } as RemoveProcessor,
          ],
        };

        // Both transpilers should reject Mustache template syntax
        expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );

        expect(() => transpileEsql(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      }
    );
  });
});
