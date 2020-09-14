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
  const subscription = server.newPlatform.setup.core.status.core$
    .pipe(pairwise())
    .subscribe(([coreLast, coreCurrent]) => {
      if (
        !subscription.closed &&
        coreLast.elasticsearch.level !== ServiceStatusLevels.available &&
        coreCurrent.elasticsearch.level === ServiceStatusLevels.available
      ) {
        // Unsubscribe as soon as ES becomes available so this function only runs once
        subscription.unsubscribe();

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
