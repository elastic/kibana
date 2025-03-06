/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchMetric, EnterpriseSearchMetricFields } from '../metrics';
import { createQuery } from '../create_query';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { getEntsearchDataset } from '../../../common/get_index_patterns';

/**
 * {@code createQuery} for all Enterprise Search instances.
 *
 * @param {Object} options The options to pass to {@code createQuery}
 */
export function createEnterpriseSearchQuery(options: {
  filters?: any[];
  metric?: EnterpriseSearchMetricFields;
  uuid?: string;
  start?: number;
  end?: number;
}) {
  const opts = {
    filters: [] as any[],
    metric: EnterpriseSearchMetric.getMetricFields(),
    clusterUuid: STANDALONE_CLUSTER_CLUSTER_UUID, // This is to disable the stack monitoring clusterUuid filter
    ...(options ?? {}),
  };

  opts.filters.push({
    bool: {
      should: [
        {
          term: {
            type: 'health',
          },
        },
        {
          term: {
            type: 'stats',
          },
        },
        {
          term: {
            'metricset.name': 'health',
          },
        },
        {
          term: {
            'metricset.name': 'stats',
          },
        },
        { term: { 'event.dataset': 'enterprisesearch.health' } },
        { term: { 'event.dataset': 'enterprisesearch.stats' } },
        { term: { 'data_stream.dataset': getEntsearchDataset('health') } },
        { term: { 'data_stream.dataset': getEntsearchDataset('stats') } },
      ],
    },
  });

  return createQuery(opts);
}
