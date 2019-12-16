/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterMetric, Metric } from '../classes';
import { SMALL_FLOAT, LARGE_FLOAT } from '../../../../common/formatting';
import { i18n } from '@kbn/i18n';

export class ApmClusterMetric extends ClusterMetric {
  constructor(opts) {
    super({
      ...opts,
      app: 'apm',
      ...ApmClusterMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'beats_stats.timestamp',
    };
  }
}

export class ApmMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'apm',
      ...ApmMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'beats_stats.beat.uuid',
      timestampField: 'beats_stats.timestamp',
    };
  }
}

export class ApmCpuUtilizationMetric extends ApmMetric {
  constructor(opts) {
    super({
      ...opts,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '%',
      derivative: true,
    });

    /*
     * Convert a counter of milliseconds of utilization time into a percentage of the bucket size
     */
    this.calculation = ({ metric_deriv: metricDeriv } = {}, _key, _metric, bucketSizeInSeconds) => {
      if (metricDeriv) {
        const { value: metricDerivValue } = metricDeriv;
        const bucketSizeInMillis = bucketSizeInSeconds * 1000;

        if (metricDerivValue >= 0 && metricDerivValue !== null) {
          return (metricDerivValue / bucketSizeInMillis) * 100;
        }
      }
      return null;
    };
  }
}

export class ApmEventsRateClusterMetric extends ApmClusterMetric {
  constructor(opts) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: i18n.translate('xpack.monitoring.metrics.apm.perMinuteUnitLabel', {
        defaultMessage: '/m',
      }),
    });

    this.aggs = {
      beats_uuids: {
        terms: {
          field: 'beats_stats.beat.uuid',
          size: 10000,
        },
        aggs: {
          event_rate_per_beat: {
            max: {
              field: this.field,
            },
          },
        },
      },
      event_rate: {
        sum_bucket: {
          buckets_path: 'beats_uuids>event_rate_per_beat',
          gap_policy: 'skip',
        },
      },
      metric_deriv: {
        derivative: {
          buckets_path: 'event_rate',
          gap_policy: 'skip',
          unit: '1m',
        },
      },
    };
  }
}
