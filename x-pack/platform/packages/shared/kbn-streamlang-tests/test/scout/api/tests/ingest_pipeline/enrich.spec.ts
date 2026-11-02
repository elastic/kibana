/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { EnrichProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import type { EnrichPolicyResolver } from '@kbn/streamlang/types/resolvers';
import { streamlangApiTest as apiTest } from '../..';
import {
  setupEnrichIndexWithPolicy,
  teardownEnrichIndexWithPolicy,
} from '../../utils/enrich_helpers';

const ENRICH_POLICY_NAME = 'test-enrich-ingest-pipeline-policy';
const ENRICH_INDEX_NAME = 'test-enrich-ingest-pipeline-index';

const mockEnrichPolicyResolver: EnrichPolicyResolver = () =>
  Promise.resolve({
    matchField: 'ip',
    enrichFields: ['city', 'country'],
  });

apiTest.describe(
  'Streamlang to Ingest Pipeline - Enrich Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await setupEnrichIndexWithPolicy(esClient, ENRICH_INDEX_NAME, ENRICH_POLICY_NAME);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await teardownEnrichIndexWithPolicy(esClient, ENRICH_INDEX_NAME, ENRICH_POLICY_NAME);
    });

    apiTest('should enrich a document with location data based on ip', async ({ testBed }) => {
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

      const { processors } = await transpile(streamlangDSL, undefined, {
        enrich: mockEnrichPolicyResolver,
      });

      const docs = [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getFlattenedDocsOrdered(indexName);
      expect(ingestedDocs).toHaveLength(2);
      expect(ingestedDocs[0]?.['location.city']).toBe('New York');
      expect(ingestedDocs[0]?.['location.country']).toBe('US');
      expect(ingestedDocs[1]?.['location.city']).toBe('London');
      expect(ingestedDocs[1]?.['location.country']).toBe('GB');
    });

    apiTest(
      'should leave the document unchanged if match field is not present and ignore_missing is true',
      async ({ testBed }) => {
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

        const { processors } = await transpile(streamlangDSL, undefined, {
          enrich: mockEnrichPolicyResolver,
        });

        const docs = [{ message: 'some message' }, { message: 'some other message' }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getFlattenedDocsOrdered(indexName);
        expect(ingestedDocs).toHaveLength(2);
        expect(ingestedDocs[0]?.['location.city']).toBeUndefined();
        expect(ingestedDocs[0]?.['location.country']).toBeUndefined();
        expect(ingestedDocs[1]?.['location.city']).toBeUndefined();
        expect(ingestedDocs[1]?.['location.country']).toBeUndefined();
      }
    );

    apiTest(
      'should fail if match field is not present and ignore_missing is false',
      async ({ testBed }) => {
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

        const { processors } = await transpile(streamlangDSL, undefined, {
          enrich: mockEnrichPolicyResolver,
        });

        const docs = [{ message: 'some message' }];
        const { errors } = await testBed.ingest(indexName, docs, processors);
        expect(errors).toHaveLength(1);
        expect(errors[0].reason).toContain('field [ip] not present as part of path [ip]');
      }
    );

    apiTest('should override the existing value if override is true', async ({ testBed }) => {
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

      const { processors } = await transpile(streamlangDSL, undefined, {
        enrich: mockEnrichPolicyResolver,
      });

      const docs = [{ ip: '10.0.0.1', location: { city: 'Test city', country: 'Test country' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getFlattenedDocsOrdered(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.['location.city']).toBe('New York');
      expect(ingestedDocs[0]?.['location.country']).toBe('US');
    });

    apiTest('should preserve existing values if override is false', async ({ testBed }) => {
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

      const { processors } = await transpile(streamlangDSL, undefined, {
        enrich: mockEnrichPolicyResolver,
      });

      const docs = [{ ip: '10.0.0.1', location: { city: 'Test city', country: 'Test country' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getFlattenedDocsOrdered(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.['location.city']).toBe('Test city');
      expect(ingestedDocs[0]?.['location.country']).toBe('Test country');
    });

    apiTest('should fail if policy name is not present', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-enrich-fail-policy-name';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'enrich',
            policy_name: 'invalid-policy-name',
            to: 'location',
          } as EnrichProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL, undefined, {
        enrich: mockEnrichPolicyResolver,
      });

      const docs = [{ ip: '10.0.0.1' }];
      await expect(async () => {
        await testBed.ingest(indexName, docs, processors);
      }).rejects.toThrow('no enrich index exists for policy with name [invalid-policy-name]');
    });
  }
);
