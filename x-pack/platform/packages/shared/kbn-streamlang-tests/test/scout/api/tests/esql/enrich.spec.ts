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
import { streamlangApiTest as apiTest } from '../..';
import {
  ENRICH_POLICY_NAME,
  setupEnrichIndexWithPolicy,
  teardownEnrichIndexWithPolicy,
} from '../../utils/enrich_helpers';

apiTest.describe(
  'Streamlang to ES|QL - Enrich Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await setupEnrichIndexWithPolicy(esClient);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await teardownEnrichIndexWithPolicy(esClient);
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
              field: 'ip',
              to: 'location',
            } as EnrichProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.documents[0].city).toBe('New York');
        expect(esqlResult.documents[0].country).toBe('US');
        expect(esqlResult.documents[1].city).toBe('London');
        expect(esqlResult.documents[1].country).toBe('GB');
      }
    );
  }
);
