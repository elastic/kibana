/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pairwise } from 'rxjs/operators';

import { ServiceStatusLevels } from '../../../../../src/core/server';
import { checkLicense } from '../check_license';

export function registerLicenseChecker(server, pluginId, pluginName, minimumLicenseRequired) {
  const xpackMainPlugin = server.plugins.xpack_main;
  server.newPlatform.setup.core.status.core$
    .pipe(pairwise())
    .subscribe(([coreLast, coreCurrent]) => {
      if (
        coreLast.elasticsearch.level !== ServiceStatusLevels.available &&
        coreCurrent.elasticsearch.level === ServiceStatusLevels.available
      ) {
        // Register a function that is called whenever the xpack info changes,
        // to re-compute the license check results for this plugin
        xpackMainPlugin.info
          .feature(pluginId)
          .registerLicenseCheckResultsGenerator((xpackLicenseInfo) => {
            return checkLicense(pluginName, minimumLicenseRequired, xpackLicenseInfo);
          });
      }
    });
}
