/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../helpers/setup_request';
import { getServiceNodesProjection } from '../../../common/projections/service_nodes';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_JAVA_THREAD_COUNT,
  METRIC_JAVA_HEAP_MEMORY_USED,
  METRIC_JAVA_NON_HEAP_MEMORY_USED
} from '../../../common/elasticsearch_fieldnames';

const getServiceNodes = async ({
  setup,
  serviceName,
  sortField = '_key',
  sortDirection = 'asc'
}: {
  setup: Setup;
  serviceName: string;
  sortField?: string;
  sortDirection?: string;
}) => {
  const { client } = setup;
  const projection = mergeProjection(
    getServiceNodesProjection({ setup, serviceName }),
    {
      body: {
        aggs: {
          nodes: {
            terms: {
              order: {
                [sortField]: sortDirection
              }
            },
            aggs: {
              cpu: {
                avg: {
                  field: METRIC_PROCESS_CPU_PERCENT
                }
              },
              heapMemory: {
                avg: {
                  field: METRIC_JAVA_HEAP_MEMORY_USED
                }
              },
              nonHeapMemory: {
                avg: {
                  field: METRIC_JAVA_NON_HEAP_MEMORY_USED
                }
              },
              threadCount: {
                max: {
                  field: METRIC_JAVA_THREAD_COUNT
                }
              }
            }
          }
        }
      }
    }
  );

  const response = await client.search(projection);

  if (!response.aggregations) {
    return [];
  }

  return response.aggregations.nodes.buckets.map(bucket => {
    return {
      name: bucket.key,
      cpu: bucket.cpu.value,
      heapMemory: bucket.heapMemory.value,
      nonHeapMemory: bucket.nonHeapMemory.value,
      threadCount: bucket.threadCount.value
    };
  });
};

export { getServiceNodes };
