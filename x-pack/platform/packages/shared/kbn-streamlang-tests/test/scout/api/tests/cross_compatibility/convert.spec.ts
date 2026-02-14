/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { ConvertProcessor, SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Convert Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest('should convert a field to a different type', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'convert',
          from: 'attributes.size',
          type: 'string',
        } as ConvertProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ attributes: { size: 4096 } }];
    await testBed.ingest('ingest-convert-value', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-convert-value');

    await testBed.ingest('esql-convert-value', docs);
    const esqlResult = await esql.queryOnIndex('esql-convert-value', query);

    expect(ingestResult[0]?.attributes?.size).toBe('4096');
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({ 'attributes.size': '4096' })
    );
  });

  apiTest(
    'should convert a field to a different type into a the target field',
    async ({ testBed, esql }) => {
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

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ attributes: { size: 4096 } }];
      await testBed.ingest('ingest-convert-value-to-target', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-convert-value-to-target');

      await testBed.ingest('esql-convert-value-to-target', docs);
      const esqlResult = await esql.queryOnIndex('esql-convert-value-to-target', query);

      expect(ingestResult[0]?.attributes?.size).toBe(4096);
      expect(esqlResult.documentsOrdered[0]).toStrictEqual(
        expect.objectContaining({ 'attributes.size': 4096 })
      );
      expect(ingestResult[0]?.attributes?.size_str).toBe('4096');
      expect(esqlResult.documentsOrdered[0]).toStrictEqual(
        expect.objectContaining({ 'attributes.size_str': '4096' })
      );
    }
  );

  apiTest(
    'should convert a field to a different type into a the target field with a where condition',
    async ({ testBed, esql }) => {
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

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ attributes: { size: 4096 } }];
      await testBed.ingest('ingest-convert-value-to-target-with-where', docs, processors);
      const ingestResult = await testBed.getDocsOrdered(
        'ingest-convert-value-to-target-with-where'
      );

      await testBed.ingest('esql-convert-value-to-target-with-where', docs);
      const esqlResult = await esql.queryOnIndex('esql-convert-value-to-target-with-where', query);

      expect(ingestResult[0]?.attributes?.size).toBe(4096);
      expect(esqlResult.documentsOrdered[0]).toStrictEqual(
        expect.objectContaining({ 'attributes.size': 4096 })
      );
      expect(ingestResult[0]?.attributes?.size_str).toBe('4096');
      expect(esqlResult.documentsOrdered[0]).toStrictEqual(
        expect.objectContaining({ 'attributes.size_str': '4096' })
      );
    }
  );

  // Template validation tests - both transpilers should consistently REJECT Mustache templates
  [
    {
      templateType: '{{ }}',
      value: '{{template_value}}',
      to: '{{template_field}}',
    },
    {
      templateType: '{{{ }}}',
      value: '{{{template_value}}}',
      to: '{{{template_field}}}',
    },
  ].forEach(({ templateType, value, to }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to,
              value,
            } as SetProcessor,
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
});
