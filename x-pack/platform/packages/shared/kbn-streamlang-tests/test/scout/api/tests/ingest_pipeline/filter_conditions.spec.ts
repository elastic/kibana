/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Filter Conditions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // This test is ingest-pipeline only because ESQL's MV_CONTAINS requires exact type matching.
    // Painless handles this gracefully via string-based comparison fallback.
    apiTest('should handle includes filter condition with numeric array', async ({ testBed }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.has_status_200',
            value: 'success',
            where: {
              field: 'attributes.status_codes',
              includes: 200,
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { status_codes: [200, 201, 204] } },
        { attributes: { status_codes: [400, 404, 500] } },
        { attributes: { status_codes: [200] } },
        { attributes: { status_codes: [301, 302] } },
      ];

      await testBed.ingest('ingest-includes-numeric', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-includes-numeric');

      // Ingest pipeline results
      expect(ingestResult[0].attributes).toStrictEqual(
        expect.objectContaining({ status_codes: [200, 201, 204], has_status_200: 'success' })
      );
      expect(ingestResult[1].attributes?.has_status_200).toBeUndefined();
      expect(ingestResult[2].attributes).toStrictEqual(
        expect.objectContaining({ status_codes: [200], has_status_200: 'success' })
      );
      expect(ingestResult[3].attributes?.has_status_200).toBeUndefined();
    });
  }
);
