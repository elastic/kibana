/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { Server } from 'hapi';
import {
  MetricThresholdAlertTypeParams,
  Comparator,
  AlertStates,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from './types';
import { AlertServices } from '../../../../../alerting/server/types';
import { infraMetricAlertSavedObjectType } from '../saved_object_mappings';

async function getMetric(
  { callCluster }: AlertServices,
  { metric, searchField, aggregation, interval, indexPattern }: MetricThresholdAlertTypeParams
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
                    [searchField.name]: searchField.value,
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
    index: indexPattern,
  });

  const { buckets } = result.aggregations.aggregatedIntervals;
  const { value } = buckets[buckets.length - 1].aggregatedValue;
  return value;
}

const comparatorMap = {
  [Comparator.GT]: (a: number, b: number) => a > b,
  [Comparator.LT]: (a: number, b: number) => a < b,
  [Comparator.GT_OR_EQ]: (a: number, b: number) => a >= b,
  [Comparator.LT_OR_EQ]: (a: number, b: number) => a <= b,
};

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
        searchField: schema.object({
          name: schema.string(),
          value: schema.string(),
        }),
        metric: schema.string(),
        interval: schema.string(),
        indexPattern: schema.string(),
      }),
    },
    actionGroups: ['fired', 'recovered'],
    async executor({ alertId, services, params }) {
      const { threshold, comparator, searchField } = params as MetricThresholdAlertTypeParams;
      const alertInstance = services.alertInstanceFactory(
        `${searchField.name}:${searchField.value}`
      );
      const { alertState } = alertInstance.getState();
      const currentValue = await getMetric(services, params as MetricThresholdAlertTypeParams);
      if (typeof currentValue === 'undefined')
        throw new Error('Could not get current value of metric');

      const comparisonFunction = comparatorMap[comparator];

      const isValueInAlertState = comparisonFunction(currentValue, threshold);
      const isAlertInFiredState = alertState === AlertStates.ALERT;
      // If the value has crossed the threshold, check to see if this just happened, or if
      // it was beyond the threshold the previous time this alert executed
      const shouldFire = isValueInAlertState && !isAlertInFiredState;
      // Vice versa for if the value has NOT crossed the threshold
      const shouldRecover = !isValueInAlertState && isAlertInFiredState;

      let nextAlertState = Boolean(isAlertInFiredState) ? AlertStates.ALERT : AlertStates.OK;

      // Only schedule actions when the value tranverses the threshold; don't renotify
      // over and over again if the value remains in an alert state
      if (shouldFire || shouldRecover) {
        alertInstance.scheduleActions(shouldFire ? 'fired' : 'recovered', {
          value: currentValue,
        });
        nextAlertState = shouldFire ? AlertStates.ALERT : AlertStates.OK;
      }

      alertInstance.replaceState({
        alertState: nextAlertState,
      });
      services.savedObjectsClient.update(infraMetricAlertSavedObjectType, alertId, {
        currentAlertState: nextAlertState,
      });
    },
  });
}
