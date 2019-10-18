/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
import { SearchParams, SearchResponse } from 'elasticsearch';
import { LensVisualizationUsage } from './types';

type ClusterSearchType = (
  endpoint: 'search',
  params: SearchParams & {
    rest_total_hits_as_int: boolean;
  },
  options?: CallClusterOptions
) => Promise<SearchResponse<unknown>>;

export async function getVisualizationCounts(
  callCluster: ClusterSearchType,
  config: KibanaConfig
): Promise<LensVisualizationUsage> {
  const scriptedMetric = {
    scripted_metric: {
      // Each cluster collects its own type data in a key-value Map that looks like:
      // { lnsDatatable: 5, area_stacked: 3 }
      init_script: 'state.types = [:]',
      // The map script relies on having flattened keyword mapping for the Lens saved object,
      // without this kind of mapping we would not be able to access `lens.state` in painless
      map_script: `
        String visType = doc['lens.visualizationType'].value;
        String niceType = visType == 'lnsXY' ? doc['lens.state.visualization.preferredSeriesType'].value : visType;
        state.types.put(niceType, state.types.containsKey(niceType) ? state.types.get(niceType) + 1 : 1);
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
        Map result = [:];
        for (Map m : states.toArray()) {
          if (m !== null) {
            for (String k : m.keySet()) {
              result.put(k, result.containsKey(k) ? result.get(k) + m.get(k) : m.get(k));
            }
          }
        }
        return result;
      `,
    },
  };

  const results = await callCluster('search', {
    index: config.get('kibana.index'),
    rest_total_hits_as_int: true,
    body: {
      query: {
        bool: {
          filter: [{ term: { type: 'lens' } }],
        },
      },
      aggs: {
        groups: {
          filters: {
            filters: {
              last30: { bool: { filter: { range: { updated_at: { gte: 'now-30d' } } } } },
              last90: { bool: { filter: { range: { updated_at: { gte: 'now-90d' } } } } },
              overall: { match_all: {} },
            },
          },
          aggs: {
            byType: scriptedMetric,
          },
        },
      },
      size: 0,
    },
  });

  const buckets = results.aggregations.groups.buckets;

  return {
    saved_overall: buckets.overall.byType.value.types,
    saved_30_days: buckets.last30.byType.value.types,
    saved_90_days: buckets.last90.byType.value.types,
    saved_overall_total: buckets.overall.doc_count,
    saved_30_days_total: buckets.last30.doc_count,
    saved_90_days_total: buckets.last90.doc_count,
  };
}
