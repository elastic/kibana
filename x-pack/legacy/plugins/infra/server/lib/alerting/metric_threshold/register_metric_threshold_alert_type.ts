/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { Server } from 'hapi';
import { METRIC_THRESHOLD_ALERT_TYPE_ID, Comparator } from './constants';
import { AlertServices } from '../../../../../alerting/server/types';
import { MetricsExplorerAggregation } from '../../../routes/metrics_explorer/types';

async function getMetric(
  { callCluster }: AlertServices,
  {
    metric,
    hostName,
    aggregation,
    interval,
  }: {
    metric: string;
    hostName: string;
    aggregation: MetricsExplorerAggregation;
    interval: string;
  }
) {
  const searchBody = {
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: `now-${interval}`,
              },
            },
          },
          {
            bool: {
              should: [
                {
                  match_phrase: {
                    'host.name': hostName,
                  },
                },
                {
                  exists: {
                    field: metric,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    size: 0,
    aggs: {
      aggregatedIntervals: {
        date_histogram: {
          field: '@timestamp',
          calendar_interval: interval,
        },
        aggregations: {
          aggregatedValue: {
            [aggregation]: {
              field: metric,
            },
          },
        },
      },
    },
  };

  const result = await callCluster('search', {
    body: searchBody,
    index: 'metricbeat-*',
  });

  const { buckets } = result.aggregations.aggregatedIntervals;
  const { value } = buckets[buckets.length - 1].aggregatedValue;
  return value;
}

const comparatorMap = {
  GT: (a: number, b: number) => a > b,
  LT: (a: number, b: number) => a < b,
  GT_OR_EQ: (a: number, b: number) => a >= b,
  LT_OR_EQ: (a: number, b: number) => a <= b,
};

interface ExecutorParams {
  threshold: number;
  comparator: Comparator;
  aggregation: MetricsExplorerAggregation;
  metric: string;
  hostName: string;
  interval: string;
}

export async function registerMetricThresholdAlertType(server: Server) {
  const { alerting } = server.plugins;
  if (!alerting) {
    throw new Error(
      'Cannot register metric threshold alert type.  Both the actions and alerting plugins need to be enabled.'
    );
  }

  alerting.registerType({
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: 'Metric Alert - Threshold',
    validate: {
      params: schema.object({
        threshold: schema.number(),
        comparator: schema.string(),
        aggregation: schema.string(),
        hostName: schema.string(),
        metric: schema.string(),
        interval: schema.string(),
      }),
    },
    actionGroups: ['default'],
    async executor({ services, params }) {
      const {
        threshold,
        comparator,
        metric,
        aggregation,
        hostName,
        interval,
      } = params as ExecutorParams;
      const alertInstance = services.alertInstanceFactory(hostName);
      const { isInAlertState } = alertInstance.getState();
      const currentValue = await getMetric(services, {
        metric,
        hostName,
        aggregation,
        interval,
      });
      if (typeof currentValue === 'undefined')
        throw new Error('Could not get current value of metric');

      const comparisonFunction = comparatorMap[comparator];

      const isValueInAlertState = comparisonFunction(currentValue, threshold);
      // If the value has crossed the threshold, check to see if this just happened, or if
      // it was beyond the threshold the previous time this alert executed
      const shouldAlert = isValueInAlertState && !isInAlertState;
      // Vice versa for if the value has NOT crossed the threshold
      const shouldRecover = !isValueInAlertState && isInAlertState;

      // Only schedule actions when the value tranverses the threshold; don't renotify
      // over and over again if the value remains in an alert state
      if (shouldAlert || shouldRecover) {
        alertInstance.scheduleActions('default', {
          hostName,
          metric,
          comparator,
          aggregation,
          isRecovery: shouldRecover,
          value: currentValue,
        });
        alertInstance.replaceState({
          isInAlertState: shouldAlert,
        });
        return;
      }
      alertInstance.replaceState({
        isInAlertState: Boolean(isInAlertState),
      });
    },
  });
}
