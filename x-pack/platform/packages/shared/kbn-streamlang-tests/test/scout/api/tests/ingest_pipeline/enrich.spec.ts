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
import { streamlangApiTest as apiTest } from '../..';

const ENRICH_SOURCE_INDEX = 'streams-e2e-enrich-source-ip-location';
const ENRICH_POLICY_NAME = 'streams-e2e-ip-location-policy';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Enrich Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // TODO - all setup/teardown helpers should be in a shared file
    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.indices.create({
        index: ENRICH_SOURCE_INDEX,
        mappings: {
          properties: {
            ip: { type: 'keyword' },
            city: { type: 'keyword' },
            country: { type: 'keyword' },
          },
        },
      });

      await esClient.bulk({
        refresh: true,
        body: [
          { index: { _index: ENRICH_SOURCE_INDEX } },
          { ip: '10.0.0.1', city: 'New York', country: 'US' },
          { index: { _index: ENRICH_SOURCE_INDEX } },
          { ip: '10.0.0.2', city: 'London', country: 'GB' },
        ],
      });

      await esClient.enrich.putPolicy({
        name: ENRICH_POLICY_NAME,
        match: {
          indices: ENRICH_SOURCE_INDEX,
          match_field: 'ip',
          enrich_fields: ['city', 'country'],
        },
      });

      await esClient.enrich.executePolicy({ name: ENRICH_POLICY_NAME });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.enrich.deletePolicy({ name: ENRICH_POLICY_NAME });
      await esClient.indices.delete({
        index: ENRICH_SOURCE_INDEX,
        ignore_unavailable: true,
      });
    });

    apiTest('should enrich a document with location data based on ip', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-enrich-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'enrich',
            policy_name: ENRICH_POLICY_NAME,
            field: 'ip',
            to: 'location',
          } as EnrichProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getFlattenedDocsOrdered(indexName);
      expect(ingestedDocs).toHaveLength(2);
      expect(ingestedDocs[0]?.['location.city']).toBe('New York');
      expect(ingestedDocs[0]?.['location.country']).toBe('US');
      expect(ingestedDocs[1]?.['location.city']).toBe('London');
      expect(ingestedDocs[1]?.['location.country']).toBe('GB');
    });
  }
);
