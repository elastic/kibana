/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UI_METRIC_USAGE_TYPE } from '../../../common/constants';

export function createUiMetricUsageCollector(server: any) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: UI_METRIC_USAGE_TYPE,
    fetch: async () => {
      const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const internalRepository = getSavedObjectsRepository(callWithInternalUser);
      const savedObjectsClient = new SavedObjectsClient(internalRepository);

      const { saved_objects: rawUiMetrics } = await savedObjectsClient.find({
        type: 'ui-metric',
        fields: ['count'],
      });

      const uiMetricsByAppName = rawUiMetrics.reduce((accum: any, rawUiMetric: any) => {
        const {
          id,
          attributes: { count },
        } = rawUiMetric;

        const [appName, metricType] = id.split(':');

        if (!accum[appName]) {
          accum[appName] = [];
        }

        const pair = { key: metricType, value: count };
        accum[appName].push(pair);
        return accum;
      }, {});

      return uiMetricsByAppName;
    },
    isReady: () => true,
  });
}
