/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';

import fakeDeprecations from '../__fixtures__/fake_deprecations.json';
import * as healthIndicatorsMock from '../__fixtures__/health_indicators';
import * as esMigrationsMock from '../__fixtures__/es_deprecations';
import type { FeatureSet } from '../../../common/types';
import { getESUpgradeStatus } from '.';
import { MigrationDeprecationsResponse } from '@elastic/elasticsearch/lib/api/types';
const fakeIndexNames = Object.keys(fakeDeprecations.index_settings);

describe('getESUpgradeStatus', () => {
  const featureSet: FeatureSet = {
    reindexCorrectiveActions: true,
    migrateSystemIndices: true,
    mlSnapshots: true,
    migrateDataStreams: true,
  };

  const resolvedIndices = {
    indices: fakeIndexNames.map((indexName) => {
      // mark one index as closed to test blockerForReindexing flag
      if (indexName === 'closed_index') {
        return { name: indexName, attributes: ['closed'] };
      }
      return { name: indexName, attributes: ['open'] };
    }),
  };

  // @ts-expect-error mock data is too loosely typed
  const deprecationsResponse: estypes.MigrationDeprecationsResponse = _.cloneDeep(fakeDeprecations);

  const esClient = elasticsearchServiceMock.createScopedClusterClient();

  esClient.asCurrentUser.healthReport.mockResponse({ cluster_name: 'mock', indicators: {} });

  esClient.asCurrentUser.migration.deprecations.mockResponse(deprecationsResponse);

  esClient.asCurrentUser.transport.request.mockResolvedValue({
    features: [
      {
        feature_name: 'machine_learning',
        minimum_index_version: '7.1.1',
        migration_status: 'MIGRATION_NEEDED',
        indices: [
          {
            index: '.ml-config',
            version: '7.1.1',
          },
        ],
      },
    ],
    migration_status: 'MIGRATION_NEEDED',
  });

  // @ts-expect-error not full interface of response
  esClient.asCurrentUser.indices.resolveIndex.mockResponse(resolvedIndices);

  it('calls /_migration/deprecations', async () => {
    await getESUpgradeStatus(esClient, featureSet);
    expect(esClient.asCurrentUser.migration.deprecations).toHaveBeenCalled();
  });

  it('returns the correct shape of data', async () => {
    const resp = await getESUpgradeStatus(esClient, featureSet);
    expect(resp).toMatchSnapshot();
  });

  it('returns totalCriticalDeprecations > 0 when critical issues found', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResponse({
      // @ts-expect-error not full interface
      cluster_settings: [{ level: 'critical', message: 'Do count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
      data_streams: {},
      ilm_policies: {},
      templates: {},
    });

    await expect(getESUpgradeStatus(esClient, featureSet)).resolves.toHaveProperty(
      'totalCriticalDeprecations',
      1
    );
  });

  it('returns totalCriticalDeprecations === 0 when no critical issues found', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResponse({
      // @ts-expect-error not full interface
      cluster_settings: [{ level: 'warning', message: 'Do not count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
      data_streams: {},
      ilm_policies: {},
      templates: {},
    });

    await expect(getESUpgradeStatus(esClient, featureSet)).resolves.toHaveProperty(
      'totalCriticalDeprecations',
      0
    );
  });

  it('filters out system indices returned by upgrade system indices API', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResponse({
      cluster_settings: [],
      node_settings: [],
      ml_settings: [],
      index_settings: {
        '.ml-config': [
          {
            level: 'critical',
            message: 'Index created before 7.0',
            url: 'https://',
            details: '...',
            resolve_during_rolling_upgrade: false,
          },
        ],
      },
      data_streams: {},
      // @ts-expect-error not in types yet
      ilm_policies: {},
      templates: {},
    });

    const upgradeStatus = await getESUpgradeStatus(esClient, featureSet);
    const {
      totalCriticalDeprecations,
      migrationsDeprecations,
      totalCriticalHealthIssues,
      enrichedHealthIndicators,
    } = upgradeStatus;
    expect([...migrationsDeprecations, ...enrichedHealthIndicators]).toHaveLength(0);
    expect(totalCriticalDeprecations).toBe(0);
    expect(totalCriticalHealthIssues).toBe(0);
  });

  it('filters out ml_settings if featureSet.mlSnapshots is set to false', async () => {
    const mockResponse = {
      ...esMigrationsMock.getMockEsDeprecations(),
      ...esMigrationsMock.getMockMlSettingsDeprecations(),
    };
    // @ts-ignore missing property definitions in ES resolve_during_rolling_upgrade and _meta
    esClient.asCurrentUser.migration.deprecations.mockResponse(mockResponse);

    const enabledUpgradeStatus = await getESUpgradeStatus(esClient, { ...featureSet });
    expect([
      ...enabledUpgradeStatus.migrationsDeprecations,
      ...enabledUpgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(2);
    expect(enabledUpgradeStatus.totalCriticalDeprecations).toBe(1);

    const disabledUpgradeStatus = await getESUpgradeStatus(esClient, {
      ...featureSet,
      mlSnapshots: false,
    });

    expect([
      ...disabledUpgradeStatus.migrationsDeprecations,
      ...disabledUpgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(0);
    expect(disabledUpgradeStatus.totalCriticalDeprecations).toBe(0);
  });

  it('filters out data_streams if featureSet.migrateDataStreams is set to false', async () => {
    const mockResponse = {
      ...esMigrationsMock.getMockEsDeprecations(),
      ...esMigrationsMock.getMockDataStreamDeprecations(),
    } as MigrationDeprecationsResponse;
    esClient.asCurrentUser.migration.deprecations.mockResponse(mockResponse);

    const enabledUpgradeStatus = await getESUpgradeStatus(esClient, { ...featureSet });
    expect([
      ...enabledUpgradeStatus.migrationsDeprecations,
      ...enabledUpgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(1);
    expect(enabledUpgradeStatus.totalCriticalDeprecations).toBe(1);

    const disabledUpgradeStatus = await getESUpgradeStatus(esClient, {
      ...featureSet,
      migrateDataStreams: false,
    });

    expect([
      ...disabledUpgradeStatus.migrationsDeprecations,
      ...disabledUpgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(0);
    expect(disabledUpgradeStatus.totalCriticalDeprecations).toBe(0);
  });

  it('filters out reindex corrective actions if featureSet.reindexCorrectiveActions is set to false', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResponse({
      cluster_settings: [],
      node_settings: [
        {
          level: 'critical',
          message: 'Index created before 7.0',
          url: 'https: //www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html',
          details: 'This index was created using version: 6.8.13',
          // @ts-ignore
          resolve_during_rolling_upgrade: false,
        },
        {
          level: 'critical',
          message: 'Index created before 7.0',
          url: 'https: //www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html',
          details: 'This index was created using version: 6.8.13',
          // @ts-ignore
          resolve_during_rolling_upgrade: false,
        },
      ],
      ml_settings: [],
      index_settings: {},
      data_streams: {},
      // @ts-expect-error not in types yet
      ilm_policies: {},
      templates: {},
    });

    const upgradeStatus = await getESUpgradeStatus(esClient, {
      ...featureSet,
      reindexCorrectiveActions: false,
    });

    expect([
      ...upgradeStatus.migrationsDeprecations,
      ...upgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(0);
    expect(upgradeStatus.totalCriticalDeprecations).toBe(0);
  });

  it('returns health indicators', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResponse({
      cluster_settings: [],
      node_settings: [
        {
          level: 'critical',
          message: 'Index created before 7.0',
          url: 'https: //www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html',
          details: 'This index was created using version: 6.8.13',
          // @ts-ignore
          resolve_during_rolling_upgrade: false,
        },
      ],
      ml_settings: [],
      index_settings: {},
      data_streams: {},
      // @ts-expect-error not in types yet
      ilm_policies: {},
      templates: {},
    });

    esClient.asCurrentUser.healthReport.mockResponse({
      cluster_name: 'mock',
      indicators: {
        disk: healthIndicatorsMock.diskIndicatorGreen,
        // @ts-ignore
        shards_capacity: healthIndicatorsMock.shardCapacityIndicatorRed,
      },
    });

    const upgradeStatus = await getESUpgradeStatus(esClient, featureSet);
    expect(upgradeStatus.totalCriticalHealthIssues + upgradeStatus.totalCriticalDeprecations).toBe(
      2
    );
    expect([...upgradeStatus.enrichedHealthIndicators, ...upgradeStatus.migrationsDeprecations])
      .toMatchInlineSnapshot(`
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
        Object {
          "correctiveAction": Object {
            "type": "reindex",
          },
          "details": "This index was created using version: 6.8.13",
          "index": undefined,
          "isCritical": true,
          "message": "Index created before 7.0",
          "resolveDuringUpgrade": false,
          "type": "node_settings",
          "url": "https: //www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html",
        },
      ]
    `);
  });
});
