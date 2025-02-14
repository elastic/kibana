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
  actions: Action[];
}

export type EsMetadata = Actions & {
  [key: string]: string;
};

// TODO(jloleysens): Replace these regexes once this issue is addressed https://github.com/elastic/elasticsearch/issues/118062
const ES_INDEX_MESSAGES_REQUIRING_REINDEX = [
  /Index created before/,
  /index with a compatibility version \</,
];

export const isFrozenDeprecation = (message: string, indexName?: string): boolean =>
  Boolean(indexName) && message.includes(`Index [${indexName}] is a frozen index`);

export const getCorrectiveAction = (
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
  const requiresReindexAction = ES_INDEX_MESSAGES_REQUIRING_REINDEX.some((regexp) =>
    regexp.test(message)
  );
  const requiresUnfreezeAction = isFrozenDeprecation(message, indexName);
  const requiresIndexSettingsAction = Boolean(indexSettingDeprecation);
  const requiresClusterSettingsAction = Boolean(clusterSettingDeprecation);
  const requiresMlAction = /[Mm]odel snapshot/.test(message);

  if (requiresReindexAction) {
    return {
      type: 'reindex',
    };
  }

  if (requiresUnfreezeAction) {
    return {
      type: 'unfreeze',
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
    const { snapshot_id: snapshotId, job_id: jobId } = metadata!;

    return {
      type: 'mlSnapshot',
      snapshotId,
      jobId,
    };
  }
};
