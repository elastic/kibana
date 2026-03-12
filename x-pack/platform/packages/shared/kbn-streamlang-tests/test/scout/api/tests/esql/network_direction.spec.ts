/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { NetworkDirectionProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Network Direction Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should set network direction with internal networks', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-network-direction-basic';

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

      const { query } = transpile(streamlangDSL);

      const docs = [{ source_ip: '128.232.110.120', destination_ip: '192.168.1.1' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]?.['network.direction']).toBe('inbound');
    });

    apiTest(
      'should set network direction with internal networks field',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-network-direction-internal-networks-field';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'network_direction',
              source_ip: 'source_ip',
              destination_ip: 'destination_ip',
              internal_networks_field: 'test_network_direction_field',
            } as NetworkDirectionProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [
          {
            source_ip: '128.232.110.120',
            destination_ip: '192.168.1.1',
            test_network_direction_field: ['private'],
          },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]?.['network.direction']).toBe('inbound');
      }
    );

    apiTest(
      'should set network direction with ignore_missing option',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-network-direction-ignore-missing';

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

        const { query } = transpile(streamlangDSL);

        const docs = [
          { source_ip: '128.232.110.120', destination_ip: '192.168.1.1' },
          { destination_ip: '192.168.1.1' },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.documents[0]?.['network.direction']).toBe('inbound');
        expect(esqlResult.documents[1]?.['network.direction']).toBeNull();
      }
    );

    apiTest('should set network direction with where condition', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-network-direction-where';

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

      const { query } = transpile(streamlangDSL);

      const docs = [
        { source_ip: '128.232.110.120', destination_ip: '192.168.1.1', event: { kind: 'test' } },
        {
          source_ip: '128.232.110.120',
          destination_ip: '192.168.1.1',
          event: { kind: 'production' },
        },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.['network.direction']).toBe('inbound');
      expect(esqlResult.documents[1]?.['network.direction']).toBeNull();
    });
  }
);
