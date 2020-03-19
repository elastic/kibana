/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mirrorPluginStatus } from '../../../../../../server/lib/mirror_plugin_status';
import { PLUGIN } from '../../../../common/constants';
import { checkLicense } from '../check_license';

export function registerLicenseChecker(__LEGACY) {
  const xpackMainPlugin = __LEGACY.server.plugins.xpack_main;
  const ccrPluggin = __LEGACY.server.plugins[PLUGIN.ID];

  mirrorPluginStatus(xpackMainPlugin, ccrPluggin);
  xpackMainPlugin.status.once('green', () => {
    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin
    xpackMainPlugin.info.feature(PLUGIN.ID).registerLicenseCheckResultsGenerator(checkLicense);
  });
}
