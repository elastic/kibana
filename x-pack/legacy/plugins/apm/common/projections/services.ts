/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupUIFilters,
  SetupTimeRange
} from '../../server/lib/helpers/setup_request';
import { SERVICE_NAME, PROCESSOR_EVENT } from '../elasticsearch_fieldnames';
import { rangeFilter } from '../../server/lib/helpers/range_filter';

export function getServicesProjection({
  setup
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, indices } = setup;

  return {
    index: [
      indices['apm_oss.metricsIndices'],
      indices['apm_oss.errorIndices'],
      indices['apm_oss.transactionIndices']
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] }
            },
            { range: rangeFilter(start, end) },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME
          }
        }
      }
    }
  };
}
