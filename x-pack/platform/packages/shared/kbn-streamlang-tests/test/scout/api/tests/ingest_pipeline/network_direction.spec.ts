/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { NetworkDirectionProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Network Direction Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should set network direction with internal networks', async ({ testBed }) => {
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
      expect(ingestedDocs[0]?.network.direction).toBe('inbound');
    });

    apiTest('should set network direction with internal networks field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-network-direction-internal-networks-field';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'network_direction',
            source_ip: 'source_ip',
            destination_ip: 'destination_ip',
            internal_networks_field: 'internal_networks',
          } as NetworkDirectionProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          source_ip: '128.232.110.120',
          destination_ip: '192.168.1.1',
          internal_networks: ['private'],
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.network.direction).toBe('inbound');
    });

    apiTest('should set network direction with target field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-network-direction-target-field';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'network_direction',
            target_field: 'test_network_direction',
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
      expect(ingestedDocs[0]?.test_network_direction).toBe('inbound');
    });

    apiTest(
      'should set network direction conditionally with where condition',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-network-direction-conditional-where';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'network_direction',
              source_ip: 'source_ip',
              destination_ip: 'destination_ip',
              internal_networks: ['private'],
              where: {
                field: 'event.kind',
                eq: 'test',
              },
            } as NetworkDirectionProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { source_ip: '128.232.110.120', destination_ip: '192.168.1.1', event: { kind: 'test' } },
          {
            source_ip: '128.232.110.120',
            destination_ip: '192.168.1.1',
            event: { kind: 'production' },
          },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(2);
        expect(ingestedDocs[0]?.network.direction).toBe('inbound');
        expect(ingestedDocs[1]?.network?.direction).toBeUndefined();
      }
    );

    apiTest(
      'should omit network direction if any fields are missing with ignore_missing option',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-network-direction-ignore-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'network_direction',
              source_ip: 'source_ip',
              destination_ip: 'destination_ip',
              internal_networks: ['private'],
              ignore_missing: true,
            } as NetworkDirectionProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { source_ip: '128.232.110.120', destination_ip: '192.168.1.1' },
          { source_ip: '128.232.110.120' },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(2);
        expect(ingestedDocs[0]?.network.direction).toBe('inbound');
        expect(ingestedDocs[1]?.network?.direction).toBeUndefined();
      }
    );
  }
);
