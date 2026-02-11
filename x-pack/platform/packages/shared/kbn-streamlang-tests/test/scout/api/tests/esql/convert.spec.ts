/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { ConvertProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Convert Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest('should convert a field to a different type', async ({ testBed, esql }) => {
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

    const { query } = transpile(streamlangDSL);

    const docs = [{ attributes: { size: 4096 } }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // `toHaveProperty` doesn't work with flattened ES|QL Rows/Documents
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        'attributes.size': '4096',
      })
    );
  });

  apiTest('should reject Mustache template syntax {{ and {{{', async () => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'convert',
          from: '{{attributes.size}}',
          to: '{{attributes.size_str}}',
          type: 'string',
        } as ConvertProcessor,
      ],
    };

    // Should throw validation error for Mustache templates
    expect(() => transpile(streamlangDSL)).toThrow(
      'Mustache template syntax {{ }} or {{{ }}} is not allowed'
    );
  });

  apiTest(
    'should convert a field to a different type into a the target field',
    async ({ testBed, esql }) => {
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

      const { query } = transpile(streamlangDSL);

      const docs = [{ attributes: { size: 4096 } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documentsOrdered[0]).toStrictEqual(
        expect.objectContaining({
          'attributes.size': 4096,
          'attributes.size_str': '4096',
        })
      );
    }
  );

  apiTest('should throw error if to and where are present but from is the same as to', async () => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'convert',
          from: 'attributes.size',
          to: 'attributes.size',
          type: 'string',
          where: {
            field: 'attributes.size',
            exists: true,
          },
        } as ConvertProcessor,
      ],
    };

    expect(() => transpile(streamlangDSL)).toThrowError(
      JSON.stringify(
        [
          {
            code: 'custom',
            message:
              'Convert processor must have the "to" parameter when there is a "where" condition. It should not be the same as the source field.',
            path: ['steps', 0, 'to', 'where'],
          },
        ],
        null,
        2
      )
    );
  });
});
