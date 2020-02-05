/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CallClusterWithRequest,
  DeprecationAPIResponse,
  DeprecationInfo,
} from 'src/legacy/core_plugins/elasticsearch';

import { RequestShim } from '../types';

export interface EnrichedDeprecationInfo extends DeprecationInfo {
  index?: string;
  node?: string;
  reindex?: boolean;
}

export interface UpgradeAssistantStatus {
  readyForUpgrade: boolean;
  cluster: EnrichedDeprecationInfo[];
  indices: EnrichedDeprecationInfo[];
}

export async function getUpgradeAssistantStatus(
  callWithRequest: CallClusterWithRequest,
  req: RequestShim,
  isCloudEnabled: boolean
): Promise<UpgradeAssistantStatus> {
  const deprecations = await callWithRequest(req, 'transport.request', {
    path: '/_migration/deprecations',
    method: 'GET',
  });

  const cluster = getClusterDeprecations(deprecations, isCloudEnabled);
  const indices = getCombinedIndexInfos(deprecations);

  const criticalWarnings = cluster.concat(indices).filter(d => d.level === 'critical');

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    cluster,
    indices,
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = (deprecations: DeprecationAPIResponse) =>
  Object.keys(deprecations.index_settings).reduce((indexDeprecations, indexName) => {
    return indexDeprecations.concat(
      deprecations.index_settings[indexName].map(
        d =>
          ({
            ...d,
            index: indexName,
            reindex: /Index created before/.test(d.message),
          } as EnrichedDeprecationInfo)
      )
    );
  }, [] as EnrichedDeprecationInfo[]);

const getClusterDeprecations = (deprecations: DeprecationAPIResponse, isCloudEnabled: boolean) => {
  const combined = deprecations.cluster_settings
    .concat(deprecations.ml_settings)
    .concat(deprecations.node_settings);

  if (isCloudEnabled) {
    // In Cloud, this is changed at upgrade time. Filter it out to improve upgrade UX.
    return combined.filter(d => d.message !== 'Security realm settings structure changed');
  } else {
    return combined;
  }
};
