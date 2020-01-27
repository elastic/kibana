/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mirrorPluginStatus } from '../mirror_plugin_status';
import { checkLicense } from '../check_license';

export function registerLicenseChecker(server, pluginId, pluginName, minimumLicenseRequired) {
  const xpackMainPlugin = server.plugins.xpack_main;
  const thisPlugin = server.plugins[pluginId];

  mirrorPluginStatus(xpackMainPlugin, thisPlugin);
  xpackMainPlugin.status.once('green', () => {
    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin
    xpackMainPlugin.info
      .feature(pluginId)
      .registerLicenseCheckResultsGenerator(xpackLicenseInfo => {
        return checkLicense(pluginName, minimumLicenseRequired, xpackLicenseInfo);
      });
  });
}
