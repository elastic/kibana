/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkLicenseGenerator } from './cluster_alerts/check_license';
import { hasMonitoringCluster } from './es_client/instantiate_client';
import { LOGGING_TAG } from '../common/constants';
import { XPackInfo } from '../../xpack_main/server/lib/xpack_info';

/*
 * Expose xpackInfo for the Monitoring cluster as server.plugins.monitoring.info
 */
export const initMonitoringXpackInfo = async ({
  config,
  server,
  client,
  xpackMainPlugin,
  licensing,
  expose,
  log,
}) => {
  const xpackInfo = hasMonitoringCluster(config)
    ? new XPackInfo(server, {
        licensing: licensing.createLicensePoller(
          client,
          config.get('xpack.monitoring.xpack_api_polling_frequency_millis')
        ),
      })
    : xpackMainPlugin.info;

  xpackInfo.feature('monitoring').registerLicenseCheckResultsGenerator(checkLicenseGenerator);
  expose('info', xpackInfo);

  // check if X-Pack is installed on Monitoring Cluster
  const xpackInfoTest = await xpackInfo.refreshNow();
  if (!xpackInfoTest.isAvailable()) {
    log(
      [LOGGING_TAG, 'warning'],
      `X-Pack Monitoring Cluster Alerts will not be available: ${xpackInfoTest.unavailableReason()}`
    );
  }
};
