/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { EnrichProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql, transpileIngestPipeline } from '@kbn/streamlang';
import type { EnrichPolicyResolver } from '@kbn/streamlang/types/resolvers';
import { streamlangApiTest as apiTest } from '../..';
import {
  setupEnrichIndexWithPolicy,
  teardownEnrichIndexWithPolicy,
} from '../../utils/enrich_helpers';

const ENRICH_POLICY_NAME = 'test-enrich-cross-compatibility-policy';
const ENRICH_INDEX_NAME = 'test-enrich-cross-compatibility-index';

const mockEnrichPolicyResolver: EnrichPolicyResolver = () =>
  Promise.resolve({
    matchField: 'ip',
    enrichFields: ['city', 'country'],
  });

const resolverOptions = { enrich: mockEnrichPolicyResolver };

apiTest.describe(
  'Cross-compatibility - Enrich Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await setupEnrichIndexWithPolicy(esClient, ENRICH_INDEX_NAME, ENRICH_POLICY_NAME);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await teardownEnrichIndexWithPolicy(esClient, ENRICH_INDEX_NAME, ENRICH_POLICY_NAME);
    });

    apiTest(
      'should add matching location fields from policy for each document',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'enrich',
              policy_name: ENRICH_POLICY_NAME,
              to: 'location',
            } as EnrichProcessor,
          ],
        };

        const { processors } = await transpileIngestPipeline(
          streamlangDSL,
          undefined,
          resolverOptions
        );
        const { query } = await transpileEsql(streamlangDSL, undefined, resolverOptions);

        const docs = [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }];

        await testBed.ingest('cross-compat-enrich-basic-ingest', docs, processors);
        const ingestDocs = await testBed.getFlattenedDocsOrdered(
          'cross-compat-enrich-basic-ingest'
        );

        await testBed.ingest('cross-compat-enrich-basic-esql', docs);
        const esqlResult = await esql.queryOnIndex('cross-compat-enrich-basic-esql', query);

        expect(ingestDocs).toHaveLength(2);
        expect(esqlResult.documentsOrdered).toHaveLength(2);

        expect(ingestDocs[0]?.['location.city']).toBe('New York');
        expect(ingestDocs[0]?.['location.country']).toBe('US');
        expect(ingestDocs[1]?.['location.city']).toBe('London');
        expect(ingestDocs[1]?.['location.country']).toBe('GB');

        expect(esqlResult.documentsOrdered[0]?.['location.city']).toBe('New York');
        expect(esqlResult.documentsOrdered[0]?.['location.country']).toBe('US');
        expect(esqlResult.documentsOrdered[1]?.['location.city']).toBe('London');
        expect(esqlResult.documentsOrdered[1]?.['location.country']).toBe('GB');
      }
    );

    apiTest(
      'should override existing location fields when override is true',
      async ({ testBed, esql }) => {
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

        const { processors } = await transpileIngestPipeline(
          streamlangDSL,
          undefined,
          resolverOptions
        );
        const { query } = await transpileEsql(streamlangDSL, undefined, resolverOptions);

        const docs = [{ ip: '10.0.0.1', location: { city: 'Test city', country: 'Test country' } }];

        await testBed.ingest('cross-compat-enrich-override-ingest', docs, processors);
        const ingestDocs = await testBed.getFlattenedDocsOrdered(
          'cross-compat-enrich-override-ingest'
        );

        await testBed.ingest('cross-compat-enrich-override-esql', docs);
        const esqlResult = await esql.queryOnIndex('cross-compat-enrich-override-esql', query);

        expect(ingestDocs).toHaveLength(1);
        expect(esqlResult.documentsOrdered).toHaveLength(1);

        expect(ingestDocs[0]?.['location.city']).toBe('New York');
        expect(ingestDocs[0]?.['location.country']).toBe('US');

        expect(esqlResult.documentsOrdered[0]?.['location.city']).toBe('New York');
        expect(esqlResult.documentsOrdered[0]?.['location.country']).toBe('US');
      }
    );

    apiTest(
      'should preserve existing location fields when override is false',
      async ({ testBed, esql }) => {
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

        const { processors } = await transpileIngestPipeline(
          streamlangDSL,
          undefined,
          resolverOptions
        );
        const { query } = await transpileEsql(streamlangDSL, undefined, resolverOptions);

        const docs = [{ ip: '10.0.0.1', location: { city: 'Test city', country: 'Test country' } }];

        await testBed.ingest('cross-compat-enrich-preserve-ingest', docs, processors);
        const ingestDocs = await testBed.getFlattenedDocsOrdered(
          'cross-compat-enrich-preserve-ingest'
        );

        await testBed.ingest('cross-compat-enrich-preserve-esql', docs);
        const esqlResult = await esql.queryOnIndex('cross-compat-enrich-preserve-esql', query);

        expect(ingestDocs).toHaveLength(1);
        expect(esqlResult.documentsOrdered).toHaveLength(1);

        expect(ingestDocs[0]?.['location.city']).toBe('Test city');
        expect(ingestDocs[0]?.['location.country']).toBe('Test country');

        expect(esqlResult.documentsOrdered[0]?.['location.city']).toBe('Test city');
        expect(esqlResult.documentsOrdered[0]?.['location.country']).toBe('Test country');
      }
    );

    apiTest(
      'with ignore_missing true, should enrich when ip is present and skip enrichment when ip is absent',
      async ({ testBed, esql }) => {
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

        const { processors } = await transpileIngestPipeline(
          streamlangDSL,
          undefined,
          resolverOptions
        );
        const { query } = await transpileEsql(streamlangDSL, undefined, resolverOptions);

        const docs = [{ ip: '10.0.0.1', message: 'has ip' }, { message: 'no ip' }];

        await testBed.ingest('cross-compat-enrich-ignore-missing-true-ingest', docs, processors);
        const ingestDocs = await testBed.getFlattenedDocsOrdered(
          'cross-compat-enrich-ignore-missing-true-ingest'
        );

        await testBed.ingest('cross-compat-enrich-ignore-missing-true-esql', docs);
        const esqlResult = await esql.queryOnIndex(
          'cross-compat-enrich-ignore-missing-true-esql',
          query
        );

        expect(ingestDocs).toHaveLength(2);
        expect(esqlResult.documentsOrdered).toHaveLength(2);

        expect(ingestDocs[0]?.['location.city']).toBe('New York');
        expect(ingestDocs[0]?.['location.country']).toBe('US');

        expect(ingestDocs[1]?.['location.city']).toBeUndefined();
        expect(ingestDocs[1]?.['location.country']).toBeUndefined();

        expect(esqlResult.documentsOrdered[0]?.['location.city']).toBe('New York');
        expect(esqlResult.documentsOrdered[0]?.['location.country']).toBe('US');

        expect(esqlResult.documentsOrdered[1]?.['location.city']).toBeNull();
        expect(esqlResult.documentsOrdered[1]?.['location.country']).toBeNull();
      }
    );

    apiTest(
      'with ignore_missing false, should drop documents with missing match field in both ingest outcomes and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = await transpileIngestPipeline(
          streamlangDSL,
          undefined,
          resolverOptions
        );
        const { query } = await transpileEsql(streamlangDSL, undefined, resolverOptions);

        const docs = [{ ip: '10.0.0.1', message: 'has ip' }, { message: 'no ip here' }];

        const { errors } = await testBed.ingest(
          'cross-compat-enrich-ignore-missing-false-ingest',
          docs,
          processors
        );
        const ingestDocs = await testBed.getFlattenedDocsOrdered(
          'cross-compat-enrich-ignore-missing-false-ingest'
        );

        expect(errors).toHaveLength(1);
        expect(errors[0]?.reason).toContain('field [ip] not present as part of path [ip]');

        await testBed.ingest('cross-compat-enrich-ignore-missing-false-esql', docs);
        const esqlResult = await esql.queryOnIndex(
          'cross-compat-enrich-ignore-missing-false-esql',
          query
        );

        expect(ingestDocs).toHaveLength(1);
        expect(esqlResult.documentsOrdered).toHaveLength(1);

        expect(ingestDocs[0]?.['location.city']).toBe('New York');
        expect(ingestDocs[0]?.['location.country']).toBe('US');
        expect(ingestDocs[0]?.ip).toBe('10.0.0.1');

        expect(esqlResult.documentsOrdered[0]?.['location.city']).toBe('New York');
        expect(esqlResult.documentsOrdered[0]?.['location.country']).toBe('US');
        expect(esqlResult.documentsOrdered[0]?.ip).toBe('10.0.0.1');
      }
    );
  }
);
