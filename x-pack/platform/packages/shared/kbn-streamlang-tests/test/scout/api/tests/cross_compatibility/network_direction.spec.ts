/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { NetworkDirectionProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql, transpileIngestPipeline } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Network Direction Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest(
      'should set network direction with internal networks in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          {
            source_ip: '128.232.110.120',
            destination_ip: '192.168.1.1',
          },
        ];

        await testBed.ingest('ingest-e2e-test-network-direction-basic', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-e2e-test-network-direction-basic');

        await testBed.ingest('esql-e2e-test-network-direction-basic', docs);
        const esqlResult = await esql.queryOnIndex('esql-e2e-test-network-direction-basic', query);

        expect(ingestResult).toHaveLength(1);
        expect(ingestResult[0]?.network.direction).toBe('inbound');
        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]?.['network.direction']).toBe('inbound');
      }
    );

    apiTest(
      'should set network direction with target field in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'network_direction',
              source_ip: 'source_ip',
              destination_ip: 'destination_ip',
              target_field: 'test_network_direction',
              internal_networks: ['private'],
            } as NetworkDirectionProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ source_ip: '128.232.110.120', destination_ip: '192.168.1.1' }];
        await testBed.ingest('ingest-e2e-test-network-direction-target-field', docs, processors);
        const ingestResult = await testBed.getDocs(
          'ingest-e2e-test-network-direction-target-field'
        );

        await testBed.ingest('esql-e2e-test-network-direction-target-field', docs);
        const esqlResult = await esql.queryOnIndex(
          'esql-e2e-test-network-direction-target-field',
          query
        );

        expect(ingestResult).toHaveLength(1);
        expect(ingestResult[0]?.test_network_direction).toBe('inbound');
        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]?.test_network_direction).toBe('inbound');
      }
    );

    apiTest(
      'should set network direction with internal networks field in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          {
            source_ip: '128.232.110.120',
            destination_ip: '192.168.1.1',
            internal_networks: ['private'],
          },
        ];

        await testBed.ingest(
          'ingest-e2e-test-network-direction-internal-networks-field',
          docs,
          processors
        );
        const ingestResult = await testBed.getDocs(
          'ingest-e2e-test-network-direction-internal-networks-field'
        );

        await testBed.ingest('esql-e2e-test-network-direction-internal-networks-field', docs);
        const esqlResult = await esql.queryOnIndex(
          'esql-e2e-test-network-direction-internal-networks-field',
          query
        );

        expect(ingestResult).toHaveLength(1);
        expect(ingestResult[0]?.network.direction).toBe('inbound');
        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]?.['network.direction']).toBe('inbound');
      }
    );

    apiTest(
      'should set network direction with ignore_missing option in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { source_ip: '128.232.110.120', destination_ip: '192.168.1.1' },
          { destination_ip: '192.168.1.1' },
        ];

        await testBed.ingest('ingest-e2e-test-network-direction-ignore-missing', docs, processors);
        const ingestResult = await testBed.getDocs(
          'ingest-e2e-test-network-direction-ignore-missing'
        );

        await testBed.ingest('esql-e2e-test-network-direction-ignore-missing', docs);
        const esqlResult = await esql.queryOnIndex(
          'esql-e2e-test-network-direction-ignore-missing',
          query
        );

        expect(ingestResult).toHaveLength(2);
        expect(ingestResult[0]?.network.direction).toBe('inbound');
        expect(ingestResult[1]?.network?.direction).toBeUndefined();
        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.documents[0]?.['network.direction']).toBe('inbound');
        expect(esqlResult.documents[1]?.['network.direction']).toBeNull();
      }
    );

    apiTest(
      'should set network direction with where condition in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { source_ip: '128.232.110.120', destination_ip: '192.168.1.1', event: { kind: 'test' } },
          {
            source_ip: '128.232.110.120',
            destination_ip: '192.168.1.1',
            event: { kind: 'production' },
          },
        ];

        await testBed.ingest('ingest-e2e-test-network-direction-where', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-e2e-test-network-direction-where');

        await testBed.ingest('esql-e2e-test-network-direction-where', docs);
        const esqlResult = await esql.queryOnIndex('esql-e2e-test-network-direction-where', query);

        expect(ingestResult).toHaveLength(2);
        expect(ingestResult[0]?.network.direction).toBe('inbound');
        expect(ingestResult[1]?.network?.direction).toBeUndefined();
        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.documents[0]?.['network.direction']).toBe('inbound');
        expect(esqlResult.documents[1]?.['network.direction']).toBeNull();
      }
    );
  }
);
