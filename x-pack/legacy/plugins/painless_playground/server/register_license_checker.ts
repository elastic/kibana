/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { mirrorPluginStatus } from '../../../server/lib/mirror_plugin_status';
import { checkLicense } from './lib/check_license';
import { PLUGIN_ID } from '../common/constants';

export function registerLicenseChecker(server: any) {
  const xpackMainPlugin = server.plugins.xpack_main;
  const plugin = server.plugins[PLUGIN_ID];

  mirrorPluginStatus(xpackMainPlugin, plugin);
  xpackMainPlugin.status.once('green', () => {
    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin
    xpackMainPlugin.info.feature(PLUGIN_ID).registerLicenseCheckResultsGenerator(checkLicense);
  });
}
