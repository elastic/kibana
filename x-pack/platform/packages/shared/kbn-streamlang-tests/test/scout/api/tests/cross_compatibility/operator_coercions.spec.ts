/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { StreamlangDSL, SetProcessor } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

// Skipped as operator coercion is not currently in sync between the transpilers
// Should be handled in https://github.com/elastic/kibana/issues/238682
apiTest.describe.skip(
  'Cross-compatibility - Operator Coercion',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    // eq true matches boolean true but not string "true"
    apiTest(
      'eq boolean (strict): true matches boolean true, not string "true"',
      async ({ testBed, esql }) => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.bool_eq_true',
              value: 'matched',
              where: { field: 'attributes.flag', eq: true },
            } as SetProcessor,
          ],
        };
        const { processors } = transpileIngestPipeline(dsl);
        const { query } = transpileEsql(dsl);

        const docs = [{ attributes: { flag: true } }, { attributes: { flag: 'true' } }];
        const mappingDoc = {
          attributes: { flag: false, bool_eq_true: '' },
        } as const;

        await testBed.ingest('cond-eq-bool-ingest', docs, processors);
        const ingest = await testBed.getFlattenedDocsOrdered('cond-eq-bool-ingest');
        expect(ingest.filter((d) => d['attributes.bool_eq_true'] === 'matched')).toHaveLength(1);

        await testBed.ingest('cond-eq-bool-esql', [mappingDoc, ...docs]);
        const esqlRes = await esql.queryOnIndex('cond-eq-bool-esql', query);
        const esqlTagged = esqlRes.documentsOrdered.filter(
          (d: any) => d.attributes?.bool_eq_true === 'matched'
        );

        expect(esqlTagged).toHaveLength(1);
      }
    );

    // eq 450 and eq "450" both match a doc having value "450"
    apiTest(
      'eq numeric vs string against string doc: both 450 and "450" match',
      async ({ testBed, esql }) => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.eq_num_450',
              value: 'matched',
              where: { field: 'attributes.val', eq: 450 },
            } as SetProcessor,
            {
              action: 'set',
              to: 'attributes.eq_str_450',
              value: 'matched',
              where: { field: 'attributes.val', eq: '450' },
            } as SetProcessor,
          ],
        };
        const { processors } = transpileIngestPipeline(dsl);
        const { query } = transpileEsql(dsl);

        const docs = [{ attributes: { val: '450' } }, { attributes: { val: '404' } }];
        const mappingDoc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          attributes: { val: '', eq_num_450: '', eq_str_450: '' },
        } as const;

        await testBed.ingest('cond-eq-450-str-ingest', docs, processors);
        const ingest = await testBed.getFlattenedDocsOrdered('cond-eq-450-str-ingest');
        expect(ingest[0]['attributes.eq_num_450']).toBe('matched');
        expect(ingest[0]['attributes.eq_str_450']).toBe('matched');
        expect(ingest[1]['attributes.eq_num_450']).toBeUndefined();
        expect(ingest[1]['attributes.eq_str_450']).toBeUndefined();

        await testBed.ingest('cond-eq-450-str-esql', [mappingDoc, ...docs]);
        const esqlRes = await esql.queryOnIndex('cond-eq-450-str-esql', query);
        const matched = esqlRes.documentsOrdered.find((d: any) => d.attributes?.val === '450');
        expect((matched as any)?.attributes?.eq_num_450).toBe('matched');
        expect((matched as any)?.attributes?.eq_str_450).toBe('matched');
      }
    );

    // eq 450 and eq "450" both match a doc having value 450
    apiTest(
      'eq numeric vs string against numeric doc: both 450 and "450" match',
      async ({ testBed, esql }) => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.eq_num_450',
              value: 'matched',
              where: { field: 'attributes.val', eq: 450 },
            } as SetProcessor,
            {
              action: 'set',
              to: 'attributes.eq_str_450',
              value: 'matched',
              where: { field: 'attributes.val', eq: '450' },
            } as SetProcessor,
          ],
        };
        const { processors } = transpileIngestPipeline(dsl);
        const { query } = transpileEsql(dsl);

        const docs = [{ attributes: { val: 450 } }, { attributes: { val: 404 } }];
        const mappingDoc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          attributes: { val: 0, eq_num_450: '', eq_str_450: '' },
        } as const;

        await testBed.ingest('cond-eq-450-num-ingest', docs, processors);
        const ingest = await testBed.getFlattenedDocsOrdered('cond-eq-450-num-ingest');
        expect(ingest[0]['attributes.eq_num_450']).toBe('matched');
        expect(ingest[0]['attributes.eq_str_450']).toBe('matched');
        expect(ingest[1]['attributes.eq_num_450']).toBeUndefined();
        expect(ingest[1]['attributes.eq_str_450']).toBeUndefined();

        await testBed.ingest('cond-eq-450-num-esql', [mappingDoc, ...docs]);
        const esqlRes = await esql.queryOnIndex('cond-eq-450-num-esql', query);
        const matched = esqlRes.documentsOrdered.find((d: any) => d['attributes.val'] === 450);
        expect((matched as any)?.attributes?.eq_num_450).toBe('matched');
        expect((matched as any)?.attributes?.eq_str_450).toBe('matched');
      }
    );

    // contains '450' should match both string "450" and numeric 450
    apiTest('contains("450") matches both string and numeric 450', async ({ testBed, esql }) => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.contains_450',
            value: 'matched',
            where: { field: 'attributes.val', contains: '450' as any },
          } as SetProcessor,
        ],
      };
      const { processors } = transpileIngestPipeline(dsl);
      const { query } = transpileEsql(dsl);

      const docs = [
        { attributes: { val: '450-abc' } },
        { attributes: { val: 450 } },
        { attributes: { val: '404' } },
      ];
      const mappingDoc = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        attributes: { val: '', contains_450: '' },
      } as const;

      await testBed.ingest('cond-contains-ingest', docs, processors);
      const ingest = await testBed.getFlattenedDocsOrdered('cond-contains-ingest');
      expect(ingest.filter((d) => d['attributes.contains_450'] === 'matched')).toHaveLength(2);

      await testBed.ingest('cond-contains-esql', [mappingDoc, ...docs]);
      const esqlRes = await esql.queryOnIndex('cond-contains-esql', query);
      const esqlTagged = esqlRes.documentsOrdered.filter(
        (d: any) => d.attributes?.contains_450 === 'matched'
      );
      expect(esqlTagged).toHaveLength(2);
    });

    // string range { gte: '8000', lte: '9000' } matches both 8500 and '8500'
    apiTest(
      "range (string bounds) matches both numeric 8500 and string '8500'",
      async ({ testBed, esql }) => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.range_str_match',
              value: 'matched',
              where: { field: 'attributes.val', range: { gte: '8000', lte: '9000' } },
            } as SetProcessor,
          ],
        };
        const { processors } = transpileIngestPipeline(dsl);
        const { query } = transpileEsql(dsl);

        const docs = [
          { attributes: { val: 8500 } },
          { attributes: { val: '8500' } },
          { attributes: { val: 9500 } },
        ];
        const mappingDoc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          attributes: { val: 0, range_str_match: '' },
        } as const;

        await testBed.ingest('cond-range-str-ingest', docs, processors);
        const ingest = await testBed.getFlattenedDocsOrdered('cond-range-str-ingest');
        expect(ingest.filter((d) => d['attributes.range_str_match'] === 'matched')).toHaveLength(2);

        await testBed.ingest('cond-range-str-esql', [mappingDoc, ...docs]);
        const esqlRes = await esql.queryOnIndex('cond-range-str-esql', query);
        const esqlTagged = esqlRes.documentsOrdered.filter(
          (d: any) => d.attributes?.range_str_match === 'matched'
        );
        expect(esqlTagged).toHaveLength(2);
      }
    );

    // numeric range { gte: 8000, lte: 9000 } matches both 8500 and '8500'
    apiTest(
      'range (numeric bounds) matches both numeric 8500 and string "8500"',
      async ({ testBed, esql }) => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.range_num_match',
              value: 'matched',
              where: { field: 'attributes.val', range: { gte: 8000, lte: 9000 } },
            } as SetProcessor,
          ],
        };
        const { processors } = transpileIngestPipeline(dsl);
        const { query } = transpileEsql(dsl);

        const docs = [
          { attributes: { val: 8500 } },
          { attributes: { val: '8500' } },
          { attributes: { val: 9500 } },
        ];
        const mappingDoc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          attributes: { val: 0, range_num_match: '' },
        } as const;

        await testBed.ingest('cond-range-num-ingest', docs, processors);
        const ingest = await testBed.getFlattenedDocsOrdered('cond-range-num-ingest');
        expect(ingest.filter((d) => d['attributes.range_num_match'] === 'matched')).toHaveLength(2);

        await testBed.ingest('cond-range-num-esql', [mappingDoc, ...docs]);
        const esqlRes = await esql.queryOnIndex('cond-range-num-esql', query);
        const esqlTagged = esqlRes.documentsOrdered.filter(
          (d: any) => d.attributes?.range_num_match === 'matched'
        );
        expect(esqlTagged).toHaveLength(2);
      }
    );
  }
);
