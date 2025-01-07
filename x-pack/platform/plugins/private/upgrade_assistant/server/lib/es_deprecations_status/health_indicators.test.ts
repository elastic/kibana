/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { getHealthIndicators } from './health_indicators';
import * as healthIndicatorsMock from '../__fixtures__/health_indicators';

describe('getHealthIndicators', () => {
  let esClient: ScopedClusterClientMock;
  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  it('returns empty array on green indicators', async () => {
    esClient.asCurrentUser.healthReport.mockResponse({
      cluster_name: 'mock',
      indicators: {
        disk: healthIndicatorsMock.diskIndicatorGreen,
        // @ts-ignore
        shards_capacity: healthIndicatorsMock.shardCapacityIndicatorGreen,
      },
    });

    const result = await getHealthIndicators(esClient);
    expect(result).toEqual([]);
  });

  it('returns unknown indicators', async () => {
    esClient.asCurrentUser.healthReport.mockResponse({
      cluster_name: 'mock',
      indicators: {
        disk: healthIndicatorsMock.diskIndicatorUnknown,
        // @ts-ignore
        shards_capacity: healthIndicatorsMock.shardCapacityIndicatorGreen,
      },
    });

    const result = await getHealthIndicators(esClient);
    expect(result[0]).toEqual(
      expect.objectContaining({
        details: 'No disk usage data.',
      })
    );
  });

  it('returns unhealthy shards_capacity indicator', async () => {
    esClient.asCurrentUser.healthReport.mockResponse({
      cluster_name: 'mock',
      indicators: {
        disk: healthIndicatorsMock.diskIndicatorGreen,
        // @ts-ignore
        shards_capacity: healthIndicatorsMock.shardCapacityIndicatorRed,
      },
    });

    const result = await getHealthIndicators(esClient);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctiveAction": Object {
            "action": "Increase the value of [cluster.max_shards_per_node] cluster setting or remove data indices to clear up resources.",
            "cause": "Elasticsearch is about to reach the maximum number of shards it can host, based on your current settings.",
            "impacts": Array [
              Object {
                "description": "The cluster has too many used shards to be able to upgrade.",
                "id": "elasticsearch:health:shards_capacity:impact:upgrade_blocked",
                "impact_areas": "[Array]",
                "severity": 1,
              },
              Object {
                "description": "The cluster is running low on room to add new shards. Adding data to new indices is at risk",
                "id": "elasticsearch:health:shards_capacity:impact:creation_of_new_indices_blocked",
                "impact_areas": "[Array]",
                "severity": 1,
              },
            ],
            "type": "healthIndicator",
          },
          "details": "Cluster is close to reaching the configured maximum number of shards for data nodes.",
          "isCritical": true,
          "message": "Elasticsearch is about to reach the maximum number of shards it can host, based on your current settings.",
          "resolveDuringUpgrade": false,
          "type": "health_indicator",
          "url": "https://ela.st/fix-shards-capacity",
        },
      ]
    `);
  });

  it('returns unhealthy disk indicator', async () => {
    esClient.asCurrentUser.healthReport.mockResponse({
      cluster_name: 'mock',
      indicators: {
        disk: healthIndicatorsMock.diskIndicatorRed,
        // @ts-ignore
        shards_capacity: healthIndicatorsMock.shardCapacityIndicatorGreen,
      },
    });

    const result = await getHealthIndicators(esClient);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctiveAction": Object {
            "cause": "The number of indices the system enforced a read-only index block (\`index.blocks.read_only_allow_delete\`) on because the cluster is running out of space.
      The number of nodes that are running low on disk and it is likely that they will run out of space. Their disk usage has tripped the <<cluster-routing-watermark-high, high watermark threshold>>.
      The number of nodes that have run out of disk. Their disk usage has tripped the <<cluster-routing-flood-stage, flood stagewatermark threshold>>.",
            "impacts": Object {
              "indices_with_readonly_block": 1,
              "nodes_over_flood_stage_watermark": 1,
              "nodes_over_high_watermark": 1,
              "nodes_with_enough_disk_space": 1,
              "nodes_with_unknown_disk_status": 1,
            },
            "type": "healthIndicator",
          },
          "details": "The cluster does not have enough available disk space.",
          "isCritical": true,
          "message": "The cluster does not have enough available disk space.",
          "resolveDuringUpgrade": false,
          "type": "health_indicator",
          "url": null,
        },
      ]
    `);
  });
});
