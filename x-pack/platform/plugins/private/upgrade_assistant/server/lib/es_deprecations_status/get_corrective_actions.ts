/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnrichedDeprecationInfo } from '../../../common/types';

interface Action {
  action_type: 'remove_settings';
  objects: string[];
}

interface Actions {
  actions?: Action[];
}

interface MlActionMetadata {
  actions?: Action[];
  snapshot_id: string;
  job_id: string;
}
interface DataStreamActionMetadata {
  actions?: Action[];
  total_backing_indices: number;
  reindex_required: boolean;

  // Action required before moving to 9.0
  indices_requiring_upgrade_count?: number;
  indices_requiring_upgrade?: string[];

  // Action not required before moving to 9.0
  ignored_indices_requiring_upgrade?: string[];
  ignored_indices_requiring_upgrade_count?: number;
}

export type EsMetadata = Actions | MlActionMetadata | DataStreamActionMetadata;

// TODO(jloleysens): Replace these regexes once this issue is addressed https://github.com/elastic/elasticsearch/issues/118062
const ES_INDEX_MESSAGES_REQIURING_REINDEX = [
  /Index created before/,
  /index with a compatibility version \</,
];

export const getCorrectiveAction = (
  deprecationType: EnrichedDeprecationInfo['type'],
  message: string,
  metadata: EsMetadata,
  indexName?: string
): EnrichedDeprecationInfo['correctiveAction'] => {
  const indexSettingDeprecation = metadata?.actions?.find(
    (action) => action.action_type === 'remove_settings' && indexName
  );
  const clusterSettingDeprecation = metadata?.actions?.find(
    (action) => action.action_type === 'remove_settings' && typeof indexName === 'undefined'
  );
  const requiresReindexAction = ES_INDEX_MESSAGES_REQIURING_REINDEX.some((regexp) =>
    regexp.test(message)
  );
  const requiresIndexSettingsAction = Boolean(indexSettingDeprecation);
  const requiresClusterSettingsAction = Boolean(clusterSettingDeprecation);
  const requiresMlAction = /[Mm]odel snapshot/.test(message);
  const requiresDataStreamsAction = deprecationType === 'data_streams';

  if (requiresDataStreamsAction) {
    const {
      total_backing_indices: totalBackingIndices,
      indices_requiring_upgrade_count: indicesRequiringUpgradeCount = 0,
      indices_requiring_upgrade: indicesRequiringUpgrade = [],

      ignored_indices_requiring_upgrade: ignoredIndicesRequiringUpgrade = [],
      ignored_indices_requiring_upgrade_count: ignoredIndicesRequiringUpgradeCount = 0,

      reindex_required: reindexRequired,
    } = metadata as DataStreamActionMetadata;

    /**
     * If there are no indices requiring upgrade, or reindexRequired = false.
     * Then we don't need to show the corrective action
     */
    if (indicesRequiringUpgradeCount < 1 || !reindexRequired) {
      return;
    }

    return {
      type: 'dataStream',
      metadata: {
        ignoredIndicesRequiringUpgrade,
        ignoredIndicesRequiringUpgradeCount,
        totalBackingIndices,
        indicesRequiringUpgradeCount,
        indicesRequiringUpgrade,
        reindexRequired,
      },
    };
  }

  if (requiresReindexAction) {
    return {
      type: 'reindex',
    };
  }

  if (requiresIndexSettingsAction) {
    return {
      type: 'indexSetting',
      deprecatedSettings: indexSettingDeprecation!.objects,
    };
  }

  if (requiresClusterSettingsAction) {
    return {
      type: 'clusterSetting',
      deprecatedSettings: clusterSettingDeprecation!.objects,
    };
  }

  if (requiresMlAction) {
    const { snapshot_id: snapshotId, job_id: jobId } = metadata as MlActionMetadata;

    return {
      type: 'mlSnapshot',
      snapshotId,
      jobId,
    };
  }
};
