/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterSettingAction,
  EnrichedDeprecationInfo,
  ESUpgradeStatus,
  IndexSettingAction,
  MlAction,
} from '../../../../../common/types';

export const MOCK_SNAPSHOT_ID = '1';
export const MOCK_JOB_ID = 'deprecation_check_job';

export const mockMlDeprecation = {
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
  } satisfies MlAction,
} satisfies EnrichedDeprecationInfo;

export const mockIndexSettingDeprecation = {
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
  } satisfies IndexSettingAction,
} satisfies EnrichedDeprecationInfo;

export const mockClusterSettingDeprecation = {
  level: 'warning',
  resolveDuringUpgrade: false,
  type: 'cluster_settings',
  message: 'Setting [cluster.routing.allocation.require._tier] is deprecated',
  details: 'deprecation details',
  url: 'doc_url',
  correctiveAction: {
    type: 'clusterSetting',
    deprecatedSettings: ['cluster.routing.allocation.require._tier'],
  } satisfies ClusterSettingAction,
} satisfies EnrichedDeprecationInfo;

export const mockDefaultDeprecation = {
  level: 'warning',
  resolveDuringUpgrade: false,
  type: 'index_settings',
  message: 'multi-fields within multi-fields',
  details: 'deprecation details',
  url: 'doc_url',
  index: 'nested_multi-fields',
} satisfies EnrichedDeprecationInfo;

export const mockReindexDeprecation = {
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
} satisfies EnrichedDeprecationInfo;

export const mockEsDeprecations = {
  totalCriticalDeprecations: 2,
  migrationsDeprecations: [
    mockMlDeprecation,
    mockIndexSettingDeprecation,
    mockDefaultDeprecation,
    mockReindexDeprecation,
    mockClusterSettingDeprecation,
  ],
  totalCriticalHealthIssues: 0,
  enrichedHealthIndicators: [],
} satisfies ESUpgradeStatus;

export const createEsDeprecations = (numDeprecationsPerType: number): ESUpgradeStatus => {
  const cloneCorrectiveAction = (
    correctiveAction: EnrichedDeprecationInfo['correctiveAction']
  ): EnrichedDeprecationInfo['correctiveAction'] => {
    if (!correctiveAction) {
      return undefined;
    }

    switch (correctiveAction.type) {
      case 'mlSnapshot':
        return { ...correctiveAction };
      case 'indexSetting':
        return {
          ...correctiveAction,
          deprecatedSettings: [...correctiveAction.deprecatedSettings],
        };
      case 'clusterSetting':
        return {
          ...correctiveAction,
          deprecatedSettings: [...correctiveAction.deprecatedSettings],
        };
      case 'reindex':
        return {
          ...correctiveAction,
          metadata: { ...correctiveAction.metadata },
        };
      default:
        return { ...correctiveAction };
    }
  };

  const cloneDeprecation = (deprecation: EnrichedDeprecationInfo): EnrichedDeprecationInfo => ({
    ...deprecation,
    correctiveAction: cloneCorrectiveAction(deprecation.correctiveAction),
  });

  const repeat = (deprecation: EnrichedDeprecationInfo) =>
    Array.from({ length: numDeprecationsPerType }, () => cloneDeprecation(deprecation));

  const mlDeprecations = repeat(mockMlDeprecation);
  const indexSettingsDeprecations = repeat(mockIndexSettingDeprecation);
  const clusterSettingsDeprecations = repeat(mockClusterSettingDeprecation);
  const reindexDeprecations = repeat(mockReindexDeprecation);
  const defaultDeprecations = repeat(mockDefaultDeprecation);
  const migrationsDeprecations = [
    ...defaultDeprecations,
    ...reindexDeprecations,
    ...indexSettingsDeprecations,
    ...clusterSettingsDeprecations,
    ...mlDeprecations,
  ];

  return {
    totalCriticalDeprecations: migrationsDeprecations.filter((d) => d.level === 'critical').length,
    migrationsDeprecations,
    totalCriticalHealthIssues: mockEsDeprecations.totalCriticalHealthIssues,
    enrichedHealthIndicators: mockEsDeprecations.enrichedHealthIndicators,
  };
};
