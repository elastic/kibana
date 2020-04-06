/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { XPackMainPlugin } from '../../../xpack_main/server/xpack_main';
import { KIBANA_REPORTING_TYPE } from '../../common/constants';
import { ReportingConfig, ReportingCore, ReportingSetupDeps } from '../../server/types';
import { ESCallCluster, ExportTypesRegistry } from '../../types';
import { getReportingUsage } from './get_reporting_usage';
import { RangeStats } from './types';

type XPackInfo = XPackMainPlugin['info'];

// places the reporting data as kibana stats
const METATYPE = 'kibana_stats';

/*
 * @return {Object} kibana usage stats type collection object
 */
export function getReportingUsageCollector(
  config: ReportingConfig,
  usageCollection: UsageCollectionSetup,
  xpackMainInfo: XPackInfo,
  exportTypesRegistry: ExportTypesRegistry,
  isReady: () => Promise<boolean>
) {
  return usageCollection.makeUsageCollector({
    type: KIBANA_REPORTING_TYPE,
    fetch: (callCluster: ESCallCluster) =>
      getReportingUsage(config, xpackMainInfo, callCluster, exportTypesRegistry),
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
  plugins: ReportingSetupDeps
) {
  if (!plugins.usageCollection) {
    return;
  }
  const xpackMainInfo = plugins.__LEGACY.plugins.xpack_main.info;

  const exportTypesRegistry = reporting.getExportTypesRegistry();
  const collectionIsReady = reporting.pluginHasStarted.bind(reporting);
  const config = reporting.getConfig();

  const collector = getReportingUsageCollector(
    config,
    plugins.usageCollection,
    xpackMainInfo,
    exportTypesRegistry,
    collectionIsReady
  );
  plugins.usageCollection.registerCollector(collector);
}
