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
  monitoring: EnrichedDeprecationInfo[];
}

export async function getUpgradeAssistantStatus(
  callWithRequest: CallClusterWithRequest,
  req: RequestShim,
  isCloudEnabled: boolean,
  monitoringCallWithRequest: CallClusterWithRequest | null
): Promise<UpgradeAssistantStatus> {
  const deprecations = await callWithRequest(req, 'transport.request', {
    path: '/_migration/deprecations',
    method: 'GET',
  });

  const cluster = getClusterDeprecations(deprecations, isCloudEnabled);
  const indices = getCombinedIndexInfos(deprecations);
  const monitoring = await getMonitoringDeprecations(req, monitoringCallWithRequest);

  const criticalWarnings = cluster.concat(indices).filter(d => d.level === 'critical');

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    cluster,
    indices,
    monitoring,
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

// TODO: move to lib?
interface PartionedMonitoringIndex {
  version: string;
  isMetricbeat: boolean;
  date: string;
}

const MONITORING_INDEX_REGEX = /\.monitoring-([^-]+)-([^-]+)-([mb]*)-?([^-]+)/;
function partitionMonitoringIndices(indices: string[]) {
  return indices.reduce(
    (accum: { [product: string]: PartionedMonitoringIndex[] }, index: string) => {
      const result = MONITORING_INDEX_REGEX.exec(index);
      if (result && result.length === 5) {
        const product = result[1];
        const version = result[2];
        const isMetricbeat = result[3] === 'mb';
        const date = result[4];

        accum[product] = accum[product] || [];
        accum[product].push({ version, isMetricbeat, date });
      }
      return accum;
    },
    {}
  );
}

const getMonitoringDeprecations = async (
  req: RequestShim,
  monitoringCallWithRequest: CallClusterWithRequest | null
): Promise<EnrichedDeprecationInfo[]> => {
  const deprecations: EnrichedDeprecationInfo[] = [];

  if (!monitoringCallWithRequest) {
    return deprecations;
  }

  const index = '*:.monitoring-*,.monitoring-*';
  const response = await monitoringCallWithRequest(req, 'search', {
    index,
    ignoreUnavailable: true,
    filterPath: 'aggregations.indices.buckets',
    size: 0,
    body: {
      query: {
        range: {
          timestamp: {
            gte: 'now-5m',
          },
        },
      },
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: 1000,
          },
        },
      },
    },
  });

  const indices = response.aggregations.indices.buckets.map(
    (bucket: { key: string }) => bucket.key
  );
  const partitioned = partitionMonitoringIndices(indices);
  const products = Object.keys(partitioned);
  for (const productName of products) {
    if (
      partitioned[productName].some(({ isMetricbeat }: PartionedMonitoringIndex) => !isMetricbeat)
    ) {
      deprecations.push({
        level: 'critical',
        message: '',
        url: '',
      });
    }
  }

  return deprecations;
};
