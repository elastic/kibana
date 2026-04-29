/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchResponse } from '../../../common/types/es';

export const entSearchAggFilterPath = [
  'aggregations.total',
  'aggregations.versions.buckets',

  // Latest values
  'aggregations.app_search_engines.value',
  'aggregations.workplace_search_org_sources.value',
  'aggregations.workplace_search_private_sources.value',

  // Cluster-wide values
  'aggregations.uptime.value',
  'aggregations.cluster_heap_used.value',
  'aggregations.cluster_heap_total.value',
  'aggregations.cluster_heap_committed.value',
];

export const entSearchUuidsAgg = (maxBucketSize: number) => ({
  // Count all unique agents
  total: {
    cardinality: {
      field: 'agent.id',
      precision_threshold: 10000,
    },
  },

  // Collect all running versions
  versions: {
    terms: {
      field: 'enterprisesearch.health.version.number',
    },
  },

  // Get latest values for some of the metrics across the recent events
  latest_report: {
    terms: {
      field: '@timestamp',
      size: 2, // There is a health and a stats event and we want to make sure we always get at least one of each
      order: {
        _key: 'desc',
      },
    },
    aggs: {
      app_search_engines: {
        max: {
          field: 'enterprisesearch.stats.product_usage.app_search.total_engines',
        },
      },
      workplace_search_org_sources: {
        max: {
          field: 'enterprisesearch.stats.product_usage.workplace_search.total_org_sources',
        },
      },
      workplace_search_private_sources: {
        max: {
          field: 'enterprisesearch.stats.product_usage.workplace_search.total_private_sources',
        },
      },
    },
  },

  // Get per-instance values using ephemeral IDs to aggreagte metrics
  ephemeral_ids: {
    terms: {
      field: 'agent.ephemeral_id',
      size: maxBucketSize,
    },
    aggs: {
      uptime_max: {
        max: {
          field: 'enterprisesearch.health.process.uptime.sec',
        },
      },
      heap_used: {
        max: {
          field: 'enterprisesearch.health.jvm.memory_usage.heap_used.bytes',
        },
      },
      heap_total: {
        max: {
          field: 'enterprisesearch.health.jvm.memory_usage.heap_max.bytes',
        },
      },
      heap_committed: {
        max: {
          field: 'enterprisesearch.health.jvm.memory_usage.heap_committed.bytes',
        },
      },
    },
  },

  // Get latest values from aggregations into global values
  app_search_engines: {
    max_bucket: {
      buckets_path: 'latest_report>app_search_engines',
    },
  },
  workplace_search_org_sources: {
    max_bucket: {
      buckets_path: 'latest_report>workplace_search_org_sources',
    },
  },
  workplace_search_private_sources: {
    max_bucket: {
      buckets_path: 'latest_report>workplace_search_private_sources',
    },
  },

  // Aggregate metrics into global values
  uptime: {
    max_bucket: {
      buckets_path: 'ephemeral_ids>uptime_max',
    },
  },
  cluster_heap_used: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>heap_used',
    },
  },
  cluster_heap_total: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>heap_total',
    },
  },
  cluster_heap_committed: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>heap_committed',
    },
  },
});

export const entSearchAggResponseHandler = (response: ElasticsearchResponse) => {
  const aggs = response.aggregations;

  // console.log('Aggs: ', aggs);

  const appSearchEngines = aggs?.app_search_engines.value ?? 0;
  const workplaceSearchOrgSources = aggs?.workplace_search_org_sources.value ?? 0;
  const workplaceSearchPrivateSources = aggs?.workplace_search_private_sources.value ?? 0;

  const totalInstances = aggs?.total.value ?? 0;
  const uptime = aggs?.uptime.value ?? 0;

  const memUsed = aggs?.cluster_heap_used.value ?? 0;
  const memCommitted = aggs?.cluster_heap_committed.value ?? 0;
  const memTotal = aggs?.cluster_heap_total.value ?? 0;

  const versions = (aggs?.versions.buckets ?? []).map(({ key }: { key: string }) => key);

  return {
    appSearchEngines,
    workplaceSearchOrgSources,
    workplaceSearchPrivateSources,
    totalInstances,
    uptime,
    memUsed,
    memCommitted,
    memTotal,
    versions,
  };
};
