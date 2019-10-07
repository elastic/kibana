/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { Setup } from '../../../../helpers/setup_request';
import { getMetricsDateHistogramParams } from '../../../../helpers/metrics';
import { ChartBase } from '../../../types';
import { getMetricsProjection } from '../../../../../../common/projections/metrics';
import { mergeProjection } from '../../../../../../common/projections/util/merge_projection';
import {
  SERVICE_AGENT_NAME,
  LABEL_NAME,
  METRIC_JAVA_GC_COUNT,
  METRIC_JAVA_GC_TIME
} from '../../../../../../common/elasticsearch_fieldnames';

const colors = [
  theme.euiColorVis0,
  theme.euiColorVis1,
  theme.euiColorVis2,
  theme.euiColorVis3,
  theme.euiColorVis4,
  theme.euiColorVis5,
  theme.euiColorVis6
];

export async function fetchAndTransformGcMetrics({
  setup,
  serviceName,
  serviceNodeName,
  chartBase,
  fieldName
}: {
  setup: Setup;
  serviceName: string;
  serviceNodeName?: string;
  chartBase: ChartBase;
  fieldName: typeof METRIC_JAVA_GC_COUNT | typeof METRIC_JAVA_GC_TIME;
}) {
  const { start, end, client } = setup;

  const projection = getMetricsProjection({
    setup,
    serviceName,
    serviceNodeName
  });

  // GC rate and time are reported by the agents as monotonically
  // increasing counters, which means that we have to calculate
  // the delta in an es query. In the future agent might start
  // reporting deltas.
  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...projection.body.query.bool.filter,
            { exists: { field: fieldName } },
            { term: { [SERVICE_AGENT_NAME]: 'java' } }
          ]
        }
      },
      aggs: {
        per_pool: {
          terms: {
            field: `${LABEL_NAME}`
          },
          aggs: {
            average: {
              avg: {
                field: fieldName
              }
            },
            over_time: {
              date_histogram: getMetricsDateHistogramParams(start, end),
              aggs: {
                // get the max value
                max: {
                  max: {
                    field: fieldName
                  }
                },
                // get the derivative, which is the delta y
                derivative: {
                  derivative: {
                    buckets_path: 'max'
                  }
                },
                // if a gc counter is reset, the delta will be >0 and
                // needs to be excluded
                value: {
                  bucket_script: {
                    buckets_path: { value: 'derivative' },
                    script: 'params.value > 0.0 ? params.value : 0.0'
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const response = await client.search(params);

  const aggregations = idx(response, _ => _.aggregations);

  if (!aggregations) {
    return {
      ...chartBase,
      totalHits: 0,
      series: []
    };
  }

  const series = aggregations.per_pool.buckets.map((poolBucket, i) => {
    const label = poolBucket.key;
    const timeseriesData = poolBucket.over_time;

    const overallValue = poolBucket.average.value;

    return {
      title: label,
      key: label,
      type: chartBase.type,
      color: colors[i],
      overallValue,
      data: (idx(timeseriesData, _ => _.buckets) || []).map((bucket, index) => {
        // derivative/value will be undefined for the first hit and if the `max` value is null
        const y =
          'value' in bucket && bucket.value.value !== null
            ? bucket.value.value
            : 0;

        return {
          y,
          x: bucket.key
        };
      })
    };
  });

  return {
    ...chartBase,
    totalHits: response.hits.total,
    series
  };
}
