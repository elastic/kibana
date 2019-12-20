/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
// @ts-ignore untyped module
import { KIBANA_STATS_TYPE_MONITORING } from '../../../monitoring/common/constants';
import { ServerFacade, ExportTypesRegistry, ESCallCluster } from '../../types';
import { KIBANA_REPORTING_TYPE } from '../../common/constants';
import { getReportingUsage } from './get_reporting_usage';
import { RangeStats } from './types';

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getReportingUsageCollector(
  usageCollection: UsageCollectionSetup,
  server: ServerFacade,
  isReady: () => boolean,
  exportTypesRegistry: ExportTypesRegistry
) {
  return usageCollection.makeUsageCollector({
    type: KIBANA_REPORTING_TYPE,
    isReady,
    fetch: (callCluster: ESCallCluster) =>
      getReportingUsage(server, callCluster, exportTypesRegistry),

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage.xpack.reporting namespace of the data payload
     */
    formatForBulkUpload: (result: RangeStats) => {
      return {
        type: KIBANA_STATS_TYPE_MONITORING,
        payload: {
          usage: {
            xpack: {
              reporting: result,
            },
          },
        },
      };
    },
  });
}

export function registerReportingUsageCollector(
  usageCollection: UsageCollectionSetup,
  server: ServerFacade,
  isReady: () => boolean,
  exportTypesRegistry: ExportTypesRegistry
) {
  const collector = getReportingUsageCollector(
    usageCollection,
    server,
    isReady,
    exportTypesRegistry
  );
  usageCollection.registerCollector(collector);
}
