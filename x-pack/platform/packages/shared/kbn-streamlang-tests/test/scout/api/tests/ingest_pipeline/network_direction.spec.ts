/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { NetworkDirectionProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Network Direction Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should set network direction', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-network-direction-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'network_direction',
            source_ip: 'source_ip',
            destination_ip: 'destination_ip',
            internal_networks: ['private'],
          } as NetworkDirectionProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ source_ip: '128.232.110.120', destination_ip: '192.168.1.1' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toHaveProperty('network.direction', 'inbound');
    });
  }
);
