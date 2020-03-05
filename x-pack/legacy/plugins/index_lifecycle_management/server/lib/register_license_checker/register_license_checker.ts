/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
// @ts-ignore
import { mirrorPluginStatus } from '../../../../../server/lib/mirror_plugin_status';
import { PLUGIN } from '../../../common/constants';
import { checkLicense } from '../check_license';

export function registerLicenseChecker(server: Legacy.Server) {
  const xpackMainPlugin = server.plugins.xpack_main as any;
  const ilmPlugin = (server.plugins as any).index_lifecycle_management;

  mirrorPluginStatus(xpackMainPlugin, ilmPlugin);
  xpackMainPlugin.status.once('green', () => {
    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin
    xpackMainPlugin.info.feature(PLUGIN.ID).registerLicenseCheckResultsGenerator(checkLicense);
  });
}
