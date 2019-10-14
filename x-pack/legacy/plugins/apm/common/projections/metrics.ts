/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../server/lib/helpers/setup_request';
import {
  SERVICE_NAME,
  PROCESSOR_EVENT,
  SERVICE_NODE_NAME
} from '../elasticsearch_fieldnames';
import { rangeFilter } from '../../server/lib/helpers/range_filter';
import { SERVICE_NODE_NAME_MISSING } from '../service_nodes';

export function getMetricsProjection({
  setup,
  serviceName,
  serviceNodeName
}: {
  setup: Setup;
  serviceName: string;
  serviceNodeName?: string;
}) {
  const { start, end, uiFiltersES, config } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'metric' } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES
  ];

  let mustNot = {};

  if (serviceNodeName && serviceNodeName === SERVICE_NODE_NAME_MISSING) {
    mustNot = {
      must_not: [
        {
          exists: { field: SERVICE_NODE_NAME }
        }
      ]
    };
  } else if (serviceNodeName) {
    filter.push({
      term: { [SERVICE_NODE_NAME]: serviceNodeName }
    });
  }

  return {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      query: {
        bool: {
          filter,
          ...mustNot
        }
      }
    }
  };
}
