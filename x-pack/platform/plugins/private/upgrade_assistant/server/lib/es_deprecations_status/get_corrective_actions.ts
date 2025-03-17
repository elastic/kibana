/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrectiveAction } from '../../../common/types';
import type { BaseDeprecation } from './migrations';

interface Action {
  action_type: 'remove_settings';
  objects: string[];
}

interface CommonActionMetadata {
  actions?: Action[];
}

interface MlActionMetadata extends CommonActionMetadata {
  snapshot_id: string;
  job_id: string;
}

interface IndexActionMetadata extends CommonActionMetadata {
  reindex_required: boolean;
  transform_ids: string[];
  is_in_data_stream?: boolean;
}

interface DataStreamActionMetadata extends CommonActionMetadata {
  excludedActions?: Array<'readOnly' | 'reindex'>;
  total_backing_indices: number;
  reindex_required: boolean;

  // Action required before moving to 9.0
  indices_requiring_upgrade_count?: number;
  indices_requiring_upgrade?: string[];

  // Action not required before moving to 9.0
  ignored_indices_requiring_upgrade?: string[];
  ignored_indices_requiring_upgrade_count?: number;
}

export type EsMetadata = IndexActionMetadata | MlActionMetadata | DataStreamActionMetadata;

export const isFrozenDeprecation = (message: string, indexName?: string): boolean =>
  Boolean(indexName) && message.includes(`Index [${indexName}] is a frozen index`);

export const getCorrectiveAction = (deprecation: BaseDeprecation): CorrectiveAction | undefined => {
  const { index, type, message, metadata } = deprecation;

  const indexSettingDeprecation = metadata?.actions?.find(
    (action) => action.action_type === 'remove_settings' && index
  );
  const clusterSettingDeprecation = metadata?.actions?.find(
    (action) => action.action_type === 'remove_settings' && typeof index === 'undefined'
  );
  const requiresReindexAction =
    (type === 'index_settings' || type === 'node_settings') &&
    (deprecation.metadata as IndexActionMetadata)?.reindex_required === true;
  const requiresUnfreezeAction = isFrozenDeprecation(message, index);
  const requiresIndexSettingsAction = Boolean(indexSettingDeprecation);
  const requiresClusterSettingsAction = Boolean(clusterSettingDeprecation);
  const requiresMlAction = /[Mm]odel snapshot/.test(message);
  const requiresDataStreamsAction = type === 'data_streams';

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
    const transformIds = (metadata as IndexActionMetadata)?.transform_ids;
    return {
      type: 'reindex',
      ...(transformIds?.length ? { transformIds } : {}),
      metadata: {
        isClosedIndex: Boolean(deprecation.isClosedIndex),
        isFrozenIndex: Boolean(deprecation.isFrozenIndex),
        isInDataStream: Boolean((deprecation.metadata as IndexActionMetadata)?.is_in_data_stream),
      },
    };
  }

  if (requiresUnfreezeAction) {
    return {
      type: 'unfreeze',
      metadata: {
        isClosedIndex: Boolean(deprecation.isClosedIndex),
        isFrozenIndex: Boolean(deprecation.isFrozenIndex),
        isInDataStream: Boolean((deprecation.metadata as IndexActionMetadata)?.is_in_data_stream),
      },
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
