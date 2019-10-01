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
  LABELS,
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
            field: `${LABELS}.name`
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
                max: {
                  max: {
                    field: fieldName
                  }
                },
                derivative: {
                  derivative: {
                    buckets_path: 'max'
                  }
                },
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
        if (!('value' in bucket)) {
          // derivative/value will be undefined for the first hit
          return {
            x: bucket.key,
            y: 0
          };
        }

        const { value } = bucket.value;
        const y = value === null || isNaN(value) ? null : value;
        return {
          x: bucket.key,
          y
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
