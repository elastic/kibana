/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../server/lib/helpers/setup_request';
import { SERVICE_NAME, PROCESSOR_EVENT } from '../elasticsearch_fieldnames';
import { rangeFilter } from '../../server/lib/helpers/range_filter';

export function getMetricsProjection({
  setup,
  serviceName
}: {
  setup: Setup;
  serviceName: string;
}) {
  const { start, end, uiFiltersES, config } = setup;

  return {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'metric' } },
            {
              range: rangeFilter(start, end)
            },
            ...uiFiltersES
          ]
        }
      }
    }
  };
}
