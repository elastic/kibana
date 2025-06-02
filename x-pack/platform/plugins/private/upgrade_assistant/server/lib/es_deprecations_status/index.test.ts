/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { estypes } from '@elastic/elasticsearch';

import fakeDeprecations from '../__fixtures__/fake_deprecations.json';
import * as healthIndicatorsMock from '../__fixtures__/health_indicators';
import * as esMigrationsMock from '../__fixtures__/es_deprecations';
import type { DataSourceExclusions, FeatureSet } from '../../../common/types';
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
  const dataSourceExclusions: DataSourceExclusions = {};

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

  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;

  esClient.healthReport.mockResponse({ cluster_name: 'mock', indicators: {} });

  esClient.migration.deprecations.mockResponse(deprecationsResponse);

  esClient.transport.request.mockResolvedValue({
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
  esClient.indices.resolveIndex.mockResponse(resolvedIndices);

  // Mock the indices.stats API call for index sizes
  esClient.indices.stats.mockResponse({
    _shards: { failed: 0, successful: 1, total: 1 },
    _all: {},
    indices: {
      'test-index-1': {
        total: {
          store: {
            size_in_bytes: 500000000, // 500MB
            reserved_in_bytes: 500000000, // 500MB
          },
        },
      },
      'test-index-2': {
        total: {
          store: {
            size_in_bytes: 1500000000, // 1.5GB
            reserved_in_bytes: 500000000, // 500MB
          },
        },
      },
    },
  });

  it('calls /_migration/deprecations', async () => {
    await getESUpgradeStatus(esClient, { featureSet, dataSourceExclusions });
    expect(esClient.migration.deprecations).toHaveBeenCalled();
  });

  it('returns the correct shape of data', async () => {
    const resp = await getESUpgradeStatus(esClient, { featureSet, dataSourceExclusions });
    expect(resp).toMatchSnapshot();
  });

  it('returns totalCriticalDeprecations > 0 when critical issues found', async () => {
    esClient.migration.deprecations.mockResponse({
      // @ts-expect-error not full interface
      cluster_settings: [{ level: 'critical', message: 'Do count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
      data_streams: {},
      ilm_policies: {},
      templates: {},
    });

    await expect(
      getESUpgradeStatus(esClient, { featureSet, dataSourceExclusions })
    ).resolves.toHaveProperty('totalCriticalDeprecations', 1);
  });

  it('returns totalCriticalDeprecations === 0 when no critical issues found', async () => {
    esClient.migration.deprecations.mockResponse({
      // @ts-expect-error not full interface
      cluster_settings: [{ level: 'warning', message: 'Do not count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
      data_streams: {},
      ilm_policies: {},
      templates: {},
    });

    await expect(
      getESUpgradeStatus(esClient, { featureSet, dataSourceExclusions })
    ).resolves.toHaveProperty('totalCriticalDeprecations', 0);
  });

  it('filters out system indices returned by upgrade system indices API', async () => {
    esClient.migration.deprecations.mockResponse({
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
      ilm_policies: {},
      templates: {},
    });

    const upgradeStatus = await getESUpgradeStatus(esClient, { featureSet, dataSourceExclusions });
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
    // @ts-expect-error missing property definitions in ES resolve_during_rolling_upgrade and _meta
    esClient.migration.deprecations.mockResponse(mockResponse);

    const enabledUpgradeStatus = await getESUpgradeStatus(esClient, {
      featureSet,
      dataSourceExclusions,
    });
    expect([
      ...enabledUpgradeStatus.migrationsDeprecations,
      ...enabledUpgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(2);
    expect(enabledUpgradeStatus.totalCriticalDeprecations).toBe(1);

    const disabledUpgradeStatus = await getESUpgradeStatus(esClient, {
      featureSet: {
        ...featureSet,
        mlSnapshots: false,
      },
      dataSourceExclusions,
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
    esClient.migration.deprecations.mockResponse(mockResponse);

    const enabledUpgradeStatus = await getESUpgradeStatus(esClient, {
      featureSet,
      dataSourceExclusions,
    });
    expect([
      ...enabledUpgradeStatus.migrationsDeprecations,
      ...enabledUpgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(1);
    expect(enabledUpgradeStatus.totalCriticalDeprecations).toBe(1);

    const disabledUpgradeStatus = await getESUpgradeStatus(esClient, {
      featureSet: {
        ...featureSet,
        migrateDataStreams: false,
      },
      dataSourceExclusions,
    });

    expect([
      ...disabledUpgradeStatus.migrationsDeprecations,
      ...disabledUpgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(0);
    expect(disabledUpgradeStatus.totalCriticalDeprecations).toBe(0);
  });

  it('filters out reindex corrective actions if featureSet.reindexCorrectiveActions is set to false', async () => {
    esClient.migration.deprecations.mockResponse({
      cluster_settings: [],
      node_settings: [
        {
          level: 'critical',
          message: 'Index created before 7.0',
          url: 'https: //www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html',
          details: 'This index was created using version: 6.8.13',
          resolve_during_rolling_upgrade: false,
          _meta: {
            reindex_required: true,
          },
        },
        {
          level: 'critical',
          message: 'Index created before 7.0',
          url: 'https: //www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html',
          details: 'This index was created using version: 6.8.13',
          resolve_during_rolling_upgrade: false,
          _meta: {
            reindex_required: true,
          },
        },
      ],
      ml_settings: [],
      index_settings: {},
      data_streams: {},
      ilm_policies: {},
      templates: {},
    });

    const upgradeStatus = await getESUpgradeStatus(esClient, {
      dataSourceExclusions,
      featureSet: {
        ...featureSet,
        reindexCorrectiveActions: false,
      },
    });

    expect([
      ...upgradeStatus.migrationsDeprecations,
      ...upgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(0);
    expect(upgradeStatus.totalCriticalDeprecations).toBe(0);
  });

  it('filters out old index deprecations enterprise search indices and data streams', async () => {
    esClient.migration.deprecations.mockResponse({
      cluster_settings: [],
      node_settings: [],
      ml_settings: [],
      index_settings: {
        '.ent-search-1': [
          {
            level: 'critical',
            message: 'Old index with a compatibility version < 8.0',
            url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/migrating-8.0.html#breaking-changes-8.0',
            details: 'This index has version: 7.17.28-8.0.0',
            resolve_during_rolling_upgrade: false,
            _meta: { reindex_required: true },
          },
          {
            level: 'critical',
            message:
              'Index [.ent-search-1] is a frozen index. The frozen indices feature is deprecated and will be removed in version 9.0.',
            url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/frozen-indices.html',
            details:
              'Frozen indices must be unfrozen before upgrading to version 9.0. (The legacy frozen indices feature no longer offers any advantages. You may consider cold or frozen tiers in place of frozen indices.)',
            resolve_during_rolling_upgrade: false,
          },
        ],
        '.ent-search-2': [
          {
            level: 'critical',
            message:
              'Index [.ent-search-2] is a frozen index. The frozen indices feature is deprecated and will be removed in version 9.0.',
            url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/frozen-indices.html',
            details:
              'Frozen indices must be unfrozen before upgrading to version 9.0. (The legacy frozen indices feature no longer offers any advantages. You may consider cold or frozen tiers in place of frozen indices.)',
            resolve_during_rolling_upgrade: false,
          },
        ],
      },
      data_streams: {
        'logs-workplace_search.test': [
          {
            level: 'critical',
            message: 'Old data stream with a compatibility version < 8.0',
            url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-9.0.html',
            details:
              'This data stream has backing indices that were created before Elasticsearch 8.0.0',
            resolve_during_rolling_upgrade: false,
            _meta: {
              indices_requiring_upgrade: ['.ds-some-backing-index-5-2024.11.07-000001'],
              indices_requiring_upgrade_count: 1,
              total_backing_indices: 2,
              reindex_required: true,
            },
          },
        ],
      },
      ilm_policies: {},
      templates: {},
    });

    const upgradeStatus = await getESUpgradeStatus(esClient, {
      featureSet,
      dataSourceExclusions: {},
    });

    expect(upgradeStatus.migrationsDeprecations).toHaveLength(2);
    expect(
      upgradeStatus.migrationsDeprecations.find(
        (dep) =>
          dep.correctiveAction?.type === 'reindex' || dep.correctiveAction?.type === 'dataStream'
      )
    ).toBeUndefined();

    expect(
      upgradeStatus.migrationsDeprecations.find((dep) => dep.index === '.ent-search-1')
    ).toMatchObject({
      details: expect.stringContaining('Frozen indices'),
    });
    expect(
      upgradeStatus.migrationsDeprecations.find((dep) => dep.index === '.ent-search-2')
    ).toMatchObject({
      details: expect.stringContaining('Frozen indices'),
    });
  });
  it('filters out frozen indices if old index deprecations exist for the same indices', async () => {
    esClient.migration.deprecations.mockResponse({
      cluster_settings: [],
      node_settings: [],
      ml_settings: [],
      index_settings: {
        frozen_index: [
          {
            level: 'critical',
            message: 'Old index with a compatibility version < 8.0',
            url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/migrating-8.0.html#breaking-changes-8.0',
            details: 'This index has version: 7.17.28-8.0.0',
            resolve_during_rolling_upgrade: false,
            _meta: { reindex_required: true },
          },
          {
            level: 'critical',
            message:
              'Index [frozen_index] is a frozen index. The frozen indices feature is deprecated and will be removed in version 9.0.',
            url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/frozen-indices.html',
            details:
              'Frozen indices must be unfrozen before upgrading to version 9.0. (The legacy frozen indices feature no longer offers any advantages. You may consider cold or frozen tiers in place of frozen indices.)',
            resolve_during_rolling_upgrade: false,
          },
        ],
      },
      data_streams: {},
      ilm_policies: {},
      templates: {},
    });

    // @ts-expect-error not full interface of response
    esClient.indices.resolveIndex.mockResponse(resolvedIndices);

    const upgradeStatus = await getESUpgradeStatus(esClient, {
      featureSet,
      dataSourceExclusions: {},
    });

    expect([
      ...upgradeStatus.migrationsDeprecations,
      ...upgradeStatus.enrichedHealthIndicators,
    ]).toHaveLength(1);
    expect(upgradeStatus.totalCriticalDeprecations).toBe(1);
  });

  it('returns health indicators', async () => {
    esClient.migration.deprecations.mockResponse({
      cluster_settings: [],
      node_settings: [
        {
          level: 'critical',
          message: 'Index created before 7.0',
          url: 'https: //www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html',
          details: 'This index was created using version: 6.8.13',
          resolve_during_rolling_upgrade: false,
          _meta: {
            reindex_required: true,
          },
        },
      ],
      ml_settings: [],
      index_settings: {},
      data_streams: {},
      ilm_policies: {},
      templates: {},
    });

    esClient.healthReport.mockResponse({
      cluster_name: 'mock',
      indicators: {
        disk: healthIndicatorsMock.diskIndicatorGreen,
        // @ts-expect-error
        shards_capacity: healthIndicatorsMock.shardCapacityIndicatorRed,
      },
    });

    const upgradeStatus = await getESUpgradeStatus(esClient, { featureSet, dataSourceExclusions });
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
          "level": "critical",
          "message": "Elasticsearch is about to reach the maximum number of shards it can host, based on your current settings.",
          "resolveDuringUpgrade": false,
          "type": "health_indicator",
          "url": "https://ela.st/fix-shards-capacity",
        },
        Object {
          "correctiveAction": Object {
            "excludedActions": Array [],
            "metadata": Object {
              "isClosedIndex": false,
              "isFrozenIndex": false,
              "isInDataStream": false,
            },
            "type": "reindex",
          },
          "details": "This index was created using version: 6.8.13",
          "index": undefined,
          "level": "critical",
          "message": "Index created before 7.0",
          "resolveDuringUpgrade": false,
          "type": "node_settings",
          "url": "https: //www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html",
        },
      ]
    `);
  });
});
