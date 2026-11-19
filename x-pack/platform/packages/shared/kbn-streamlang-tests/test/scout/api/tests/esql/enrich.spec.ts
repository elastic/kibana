/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { EnrichProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/esql';
import type { EnrichPolicyResolver } from '@kbn/streamlang/types/resolvers';
import { streamlangApiTest as apiTest } from '../..';
import {
  setupEnrichIndexWithPolicy,
  teardownEnrichIndexWithPolicy,
} from '../../utils/enrich_helpers';

const ENRICH_POLICY_NAME = 'test-enrich-esql-policy';
const ENRICH_INDEX_NAME = 'test-enrich-esql-index';

const mockEnrichPolicyResolver: EnrichPolicyResolver = () =>
  Promise.resolve({
    matchField: 'ip',
    enrichFields: ['city', 'country'],
  });

apiTest.describe(
  'Streamlang to ES|QL - Enrich Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await setupEnrichIndexWithPolicy(esClient, ENRICH_INDEX_NAME, ENRICH_POLICY_NAME);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await teardownEnrichIndexWithPolicy(esClient, ENRICH_INDEX_NAME, ENRICH_POLICY_NAME);
    });

    apiTest(
      'should enrich a document with location data based on ip',
      async ({ testBed, esql }) => {
        const indexName = 'streams-e2e-test-enrich-basic';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'enrich',
              policy_name: ENRICH_POLICY_NAME,
              to: 'location',
            } as EnrichProcessor,
          ],
        };

        const { query } = await transpile(streamlangDSL, undefined, {
          enrich: mockEnrichPolicyResolver,
        });

        const docs = [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documentsOrdered).toHaveLength(2);
        expect(esqlResult.documentsOrdered[0]['location.city']).toBe('New York');
        expect(esqlResult.documentsOrdered[0]['location.country']).toBe('US');
        expect(esqlResult.documentsOrdered[1]['location.city']).toBe('London');
        expect(esqlResult.documentsOrdered[1]['location.country']).toBe('GB');
      }
    );

    apiTest(
      'should leave the document unchanged if match field is not present and ignore_missing is true',
      async ({ testBed, esql }) => {
        const indexName = 'streams-e2e-test-enrich-ignore-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'enrich',
              policy_name: ENRICH_POLICY_NAME,
              to: 'location',
              ignore_missing: true,
            } as EnrichProcessor,
          ],
        };

        const { query } = await transpile(streamlangDSL, undefined, {
          enrich: mockEnrichPolicyResolver,
        });
        const docs = [
          { ip: '10.0.0.1', message: 'some message' },
          { message: 'some other message' },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documentsOrdered).toHaveLength(2);
        expect(esqlResult.documentsOrdered[0]['location.city']).toBe('New York');
        expect(esqlResult.documentsOrdered[0]['location.country']).toBe('US');
        expect(esqlResult.documentsOrdered[1]['location.city']).toBeNull();
        expect(esqlResult.documentsOrdered[1]['location.country']).toBeNull();
      }
    );

    apiTest(
      'should filter out documents where match field is missing when ignore_missing is false',
      async ({ testBed, esql }) => {
        const indexName = 'streams-e2e-test-enrich-fail-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'enrich',
              policy_name: ENRICH_POLICY_NAME,
              to: 'location',
              ignore_missing: false,
            } as EnrichProcessor,
          ],
        };

        const { query } = await transpile(streamlangDSL, undefined, {
          enrich: mockEnrichPolicyResolver,
        });
        const docs = [{ ip: '10.0.0.1', message: 'has ip' }, { message: 'no ip here' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // Only the doc with ip survives the WHERE filter
        expect(esqlResult.documentsOrdered).toHaveLength(1);
        expect(esqlResult.documentsOrdered[0]['location.city']).toBe('New York');
      }
    );

    apiTest('should override the existing value if override is true', async ({ testBed, esql }) => {
      const indexName = 'streams-e2e-test-enrich-override';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'enrich',
            policy_name: ENRICH_POLICY_NAME,
            to: 'location',
            override: true,
          } as EnrichProcessor,
        ],
      };

      const { query } = await transpile(streamlangDSL, undefined, {
        enrich: mockEnrichPolicyResolver,
      });

      const docs = [{ ip: '10.0.0.1', location: { city: 'Test city', country: 'Test country' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documentsOrdered).toHaveLength(1);
      expect(esqlResult.documentsOrdered[0]['location.city']).toBe('New York');
      expect(esqlResult.documentsOrdered[0]['location.country']).toBe('US');
    });

    apiTest(
      'should preserve the existing value if override is false',
      async ({ testBed, esql }) => {
        const indexName = 'streams-e2e-test-enrich-preserve-existing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'enrich',
              policy_name: ENRICH_POLICY_NAME,
              to: 'location',
              override: false,
            } as EnrichProcessor,
          ],
        };

        const { query } = await transpile(streamlangDSL, undefined, {
          enrich: mockEnrichPolicyResolver,
        });

        const docs = [{ ip: '10.0.0.1', location: { city: 'Test city', country: 'Test country' } }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documentsOrdered).toHaveLength(1);
        expect(esqlResult.documentsOrdered[0]['location.city']).toBe('Test city');
        expect(esqlResult.documentsOrdered[0]['location.country']).toBe('Test country');
      }
    );
  }
);
