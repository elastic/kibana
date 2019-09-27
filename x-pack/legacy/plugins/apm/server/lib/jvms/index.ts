/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../helpers/setup_request';
import { getJvmsProjection } from '../../../common/projections/jvms';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_JAVA_THREAD_COUNT,
  METRIC_JAVA_HEAP_MEMORY_USED,
  METRIC_JAVA_NON_HEAP_MEMORY_USED
} from '../../../common/elasticsearch_fieldnames';

const getJvms = async ({
  setup,
  serviceName,
  sortField,
  sortDirection
}: {
  setup: Setup;
  serviceName: string;
  sortField?: string;
  sortDirection?: string;
}) => {
  const { client } = setup;
  const projection = mergeProjection(
    getJvmsProjection({ setup, serviceName }),
    {
      body: {
        aggs: {
          jvms: {
            terms: {
              order: {
                [sortField || '_key']: sortDirection || 'asc'
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

  return response.aggregations.jvms.buckets.map(bucket => {
    return {
      name: bucket.key,
      cpu: bucket.cpu.value,
      heapMemory: bucket.heapMemory.value,
      nonHeapMemory: bucket.nonHeapMemory.value,
      threadCount: bucket.threadCount.value
    };
  });
};

export { getJvms };
