/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { AppendProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Append Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest('should append a value to an existing array', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'append',
          to: 'tags',
          value: ['new_tag'],
        } as AppendProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ tags: ['existing_tag'] }];
    await testBed.ingest('ingest-append', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-append');

    await testBed.ingest('esql-append', docs);
    const esqlResult = await esql.queryOnIndex('esql-append', query);

    expect(ingestResult[0].tags).toStrictEqual(['existing_tag', 'new_tag']);
    expect(esqlResult.documentsOrdered[0].tags).toStrictEqual(['existing_tag', 'new_tag']);
  });

  apiTest('should append multiple values to a non-existent field', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'append',
          to: 'tags',
          value: ['tag1', 'tag2'],
        } as AppendProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ message: 'a' }];
    await testBed.ingest('ingest-append-non-existent', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-append-non-existent');

    // ES|QL requires the field to be pre-mapped, so we ingest a doc with the field first
    await testBed.ingest('esql-append-non-existent', [{ tags: ['initial_tag'] }, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-append-non-existent', query);

    expect(ingestResult[0].tags).toStrictEqual(['tag1', 'tag2']);
    expect(esqlResult.documentsOrdered[1].tags).toStrictEqual(['tag1', 'tag2']);
  });

  // Template validation tests - both transpilers should consistently REJECT Mustache templates
  [
    {
      templateType: '{{ }}',
      to: '{{template_to}}',
      value: ['{{template_value_01}}', '{{template_value_02}}'],
    },
    {
      templateType: '{{{ }}}',
      to: '{{{template_to}}}',
      value: ['{{{template_value_01}}}', '{{{template_value_02}}}'],
    },
  ].forEach(({ templateType, to, value }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'append',
              to,
              value,
            } as AppendProcessor,
          ],
        };

        // Both transpilers should throw validation errors for Mustache templates
        expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed'
        );
        expect(() => transpileEsql(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed'
        );
      }
    );
  });

  // *** Incompatible / Partially Compatible Cases ***
  // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
  // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.
  apiTest(
    'should result in an array in ingest, but a scalar in ES|QL for a single value',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['new_tag'],
          } as AppendProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'a' }];
      await testBed.ingest('ingest-append-scalar', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-append-scalar');

      // ES|QL requires the field to be pre-mapped, so we ingest a doc with the field first
      await testBed.ingest('esql-append-scalar', [{ tags: ['initial_tag'] }, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-append-scalar', query);

      expect(ingestResult[0].tags).toStrictEqual(['new_tag']); // Ingest creates an array
      expect(esqlResult.documentsOrdered[1].tags).toBe('new_tag'); // ES|QL creates a scalar
    }
  );

  apiTest(
    'should result in an array in ingest, but a scalar in ES|QL when deduplicating to a single value',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['existing_tag'],
            allow_duplicates: false,
          } as AppendProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ tags: ['existing_tag'] }];
      await testBed.ingest('ingest-append-dedupe', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-append-dedupe');

      await testBed.ingest('esql-append-dedupe', docs);
      const esqlResult = await esql.queryOnIndex('esql-append-dedupe', query);

      expect(ingestResult[0].tags).toStrictEqual(['existing_tag']); // Ingest results in an array
      expect(esqlResult.documentsOrdered[0].tags).toBe('existing_tag'); // ES|QL results in a scalar
    }
  );
});
