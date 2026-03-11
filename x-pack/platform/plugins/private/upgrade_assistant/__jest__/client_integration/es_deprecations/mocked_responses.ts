/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESUpgradeStatus, EnrichedDeprecationInfo } from '../../../common/types';

export const MOCK_SNAPSHOT_ID = '1';
export const MOCK_JOB_ID = 'deprecation_check_job';

export const MOCK_ML_DEPRECATION: EnrichedDeprecationInfo = {
  level: 'critical',
  resolveDuringUpgrade: false,
  type: 'ml_settings',
  message: 'model snapshot [1] for job [deprecation_check_job] needs to be deleted or upgraded',
  details:
    'model snapshot [%s] for job [%s] supports minimum version [%s] and needs to be at least [%s]',
  url: 'doc_url',
  correctiveAction: {
    type: 'mlSnapshot',
    snapshotId: MOCK_SNAPSHOT_ID,
    jobId: MOCK_JOB_ID,
  },
};

export const MOCK_REINDEX_DEPRECATION: EnrichedDeprecationInfo = {
  level: 'critical',
  resolveDuringUpgrade: false,
  type: 'index_settings',
  message: 'Index created before 7.0',
  details: 'deprecation details',
  url: 'doc_url',
  index: 'reindex_index',
  correctiveAction: {
    type: 'reindex',
    metadata: {
      isClosedIndex: false,
      isFrozenIndex: false,
      isInDataStream: false,
    },
  },
};

const MOCK_INDEX_SETTING_DEPRECATION: EnrichedDeprecationInfo = {
  level: 'warning',
  resolveDuringUpgrade: false,
  type: 'index_settings',
  message: 'Setting [index.routing.allocation.include._tier] is deprecated',
  details: 'deprecation details',
  url: 'doc_url',
  index: 'my_index',
  correctiveAction: {
    type: 'indexSetting',
    deprecatedSettings: ['index.routing.allocation.include._tier'],
  },
};

const MOCK_CLUSTER_SETTING_DEPRECATION: EnrichedDeprecationInfo = {
  level: 'warning',
  resolveDuringUpgrade: false,
  type: 'cluster_settings',
  message: 'Setting [cluster.routing.allocation.require._tier] is deprecated',
  details: 'deprecation details',
  url: 'doc_url',
  correctiveAction: {
    type: 'clusterSetting',
    deprecatedSettings: ['cluster.routing.allocation.require._tier'],
  },
};

const MOCK_DEFAULT_DEPRECATION: EnrichedDeprecationInfo = {
  level: 'warning',
  resolveDuringUpgrade: false,
  type: 'index_settings',
  message: 'multi-fields within multi-fields',
  details: 'deprecation details',
  url: 'doc_url',
  index: 'nested_multi-fields',
};

export const MOCK_DS_DEPRECATION: EnrichedDeprecationInfo = {
  index: 'reindex_or_readonly_ds',
  type: 'data_streams',
  details: 'Data stream deprecation details',
  message: 'Outdated data stream',
  url: 'doc_url',
  level: 'critical',
  resolveDuringUpgrade: false,
  correctiveAction: {
    type: 'dataStream',
    metadata: {
      excludedActions: [],
      reindexRequired: true,
      totalBackingIndices: 1,
      indicesRequiringUpgradeCount: 1,
      indicesRequiringUpgrade: ['ds_index'],
      ignoredIndicesRequiringUpgrade: [],
      ignoredIndicesRequiringUpgradeCount: 0,
    },
  },
};

export const MOCK_DS_DEPRECATION_REINDEX: EnrichedDeprecationInfo = {
  index: 'reindex_ds',
  type: 'data_streams',
  details: 'Data stream deprecation details',
  message: 'Outdated data stream',
  url: 'doc_url',
  level: 'critical',
  resolveDuringUpgrade: false,
  correctiveAction: {
    type: 'dataStream',
    metadata: {
      excludedActions: ['readOnly'],
      reindexRequired: true,
      totalBackingIndices: 1,
      indicesRequiringUpgradeCount: 1,
      indicesRequiringUpgrade: ['ds_index'],
      ignoredIndicesRequiringUpgrade: [],
      ignoredIndicesRequiringUpgradeCount: 0,
    },
  },
};

export const MOCK_DS_DEPRECATION_READ_ONLY: EnrichedDeprecationInfo = {
  index: 'readonly_ds',
  type: 'data_streams',
  details: 'Data stream deprecation details',
  message: 'Outdated data stream',
  url: 'doc_url',
  level: 'critical',
  resolveDuringUpgrade: false,
  correctiveAction: {
    type: 'dataStream',
    metadata: {
      excludedActions: ['reindex'],
      reindexRequired: true,
      totalBackingIndices: 1,
      indicesRequiringUpgradeCount: 1,
      indicesRequiringUpgrade: ['ds_index'],
      ignoredIndicesRequiringUpgrade: [],
      ignoredIndicesRequiringUpgradeCount: 0,
    },
  },
};

export const esDeprecationsMockResponse: ESUpgradeStatus = {
  totalCriticalDeprecations: 2,
  migrationsDeprecations: [
    MOCK_ML_DEPRECATION,
    MOCK_INDEX_SETTING_DEPRECATION,
    MOCK_DEFAULT_DEPRECATION,
    MOCK_REINDEX_DEPRECATION,
    MOCK_CLUSTER_SETTING_DEPRECATION,
    MOCK_DS_DEPRECATION,
    MOCK_DS_DEPRECATION_REINDEX,
    MOCK_DS_DEPRECATION_READ_ONLY,
  ],
  totalCriticalHealthIssues: 0,
  enrichedHealthIndicators: [],
};

// Useful for testing pagination where a large number of deprecations are needed
export const createEsDeprecationsMockResponse = (
  numDeprecationsPerType: number
): ESUpgradeStatus => {
  const mlDeprecations: EnrichedDeprecationInfo[] = Array.from(
    {
      length: numDeprecationsPerType,
    },
    () => MOCK_ML_DEPRECATION
  );

  const indexSettingsDeprecations: EnrichedDeprecationInfo[] = Array.from(
    {
      length: numDeprecationsPerType,
    },
    () => MOCK_INDEX_SETTING_DEPRECATION
  );

  const reindexDeprecations: EnrichedDeprecationInfo[] = Array.from(
    {
      length: numDeprecationsPerType,
    },
    () => MOCK_REINDEX_DEPRECATION
  );

  const defaultDeprecations: EnrichedDeprecationInfo[] = Array.from(
    {
      length: numDeprecationsPerType,
    },
    () => MOCK_DEFAULT_DEPRECATION
  );

  const migrationsDeprecations: EnrichedDeprecationInfo[] = [
    ...defaultDeprecations,
    ...reindexDeprecations,
    ...indexSettingsDeprecations,
    ...mlDeprecations,
  ];

  return {
    totalCriticalDeprecations: mlDeprecations.length + reindexDeprecations.length,
    migrationsDeprecations,
    totalCriticalHealthIssues: esDeprecationsMockResponse.totalCriticalHealthIssues,
    enrichedHealthIndicators: esDeprecationsMockResponse.enrichedHealthIndicators,
  };
};
