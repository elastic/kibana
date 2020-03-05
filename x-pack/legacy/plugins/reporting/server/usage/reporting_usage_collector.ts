/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { KIBANA_REPORTING_TYPE } from '../../common/constants';
import { ReportingCore } from '../../server';
import { ESCallCluster, ExportTypesRegistry, ServerFacade } from '../../types';
import { getReportingUsage } from './get_reporting_usage';
import { RangeStats } from './types';

// places the reporting data as kibana stats
const METATYPE = 'kibana_stats';

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getReportingUsageCollector(
  server: ServerFacade,
  usageCollection: UsageCollectionSetup,
  exportTypesRegistry: ExportTypesRegistry,
  isReady: () => Promise<boolean>
) {
  return usageCollection.makeUsageCollector({
    type: KIBANA_REPORTING_TYPE,
    fetch: (callCluster: ESCallCluster) =>
      getReportingUsage(server, callCluster, exportTypesRegistry),
    isReady,

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage.xpack.reporting namespace of the data payload
     */
    formatForBulkUpload: (result: RangeStats) => {
      return {
        type: METATYPE,
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
  reporting: ReportingCore,
  server: ServerFacade,
  usageCollection: UsageCollectionSetup
) {
  const exportTypesRegistry = reporting.getExportTypesRegistry();
  const collectionIsReady = reporting.pluginHasStarted.bind(reporting);

  const collector = getReportingUsageCollector(
    server,
    usageCollection,
    exportTypesRegistry,
    collectionIsReady
  );
  usageCollection.registerCollector(collector);
}
