/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RenameProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Rename Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest('should rename a field when override is true', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ host: { original: 'test-host', renamed: 'old-host' } }];
    await testBed.ingest('ingest-rename-override', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-rename-override');

    await testBed.ingest('esql-rename-override', docs);
    const esqlResult = await esql.queryOnIndex('esql-rename-override', query);

    expect(ingestResult[0]['host.renamed']).toBe('test-host');
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({ 'host.renamed': 'test-host' })
    );

    // Both results should be same
    expect(ingestResult).toStrictEqual(esqlResult.documentsWithoutKeywordsOrdered);
  });

  apiTest(
    'should not process the document when override is false and target field exists',
    async ({ testBed, esql }) => {
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

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ host: { original: 'test-host', renamed: 'old-host' } }];

      await testBed.ingest('ingest-rename-no-override', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-rename-no-override');

      await testBed.ingest('esql-rename-no-override', docs);
      const esqlResult = await esql.queryOnIndex('esql-rename-no-override', query);

      expect(ingestResult).toHaveLength(0);

      // ES|QL too should have filtered out the document as target field exists and override is false
      expect(esqlResult.documents).toHaveLength(0);
    }
  );

  // Template validation tests - both transpilers should consistently REJECT Mustache templates
  [
    {
      templateType: '{{ }}',
      from: '{{template_from}}',
      to: '{{template_to}}',
    },
    {
      templateType: '{{{ }}}',
      from: '{{{template_from}}}',
      to: '{{{template_to}}}',
    },
  ].forEach(({ templateType, from, to }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'rename',
              from,
              to,
            } as RenameProcessor,
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

  apiTest(
    'should be handled by both ingest and ES|QL when field is missing and ignore_missing is false',
    async ({ testBed, esql }) => {
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

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'some_value' }];

      const { errors } = await testBed.ingest('ingest-rename-fail', docs, processors);
      expect(errors[0].type).toBe('illegal_argument_exception');
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-rename-fail');

      const mappingDoc = { host: { original: '', renamed: '' } };
      await testBed.ingest('esql-rename-fail', [mappingDoc, ...docs]);
      await esql.queryOnIndex('esql-rename-fail', query);

      expect(ingestResult).toHaveLength(0); // Did not ingest, errored out
    }
  );

  // *** Incompatible / Partially Compatible Cases ***
  // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
  // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.
});
