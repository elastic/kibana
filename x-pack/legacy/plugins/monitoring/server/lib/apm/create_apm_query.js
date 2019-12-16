/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash';
import { ApmMetric } from '../metrics';
import { createQuery } from '../create_query';

/**
 * {@code createQuery} for all APM instances.
 *
 * @param {Object} options The options to pass to {@code createQuery}
 */
export function createApmQuery(options = {}) {
  options = defaults(options, {
    filters: [],
    metric: ApmMetric.getMetricFields(),
    type: 'beats_stats',
  });

  options.filters.push({
    bool: {
      must: {
        term: {
          'beats_stats.beat.type': 'apm-server',
        },
      },
    },
  });

  return createQuery(options);
}
