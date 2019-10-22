/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import Boom from 'boom';

// @ts-ignore
import { profileRoute } from './server/routes/profile';

// License
// @ts-ignore
import { checkLicense } from './server/lib/check_license';
// @ts-ignore
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';

export const searchprofiler = (kibana: any) => {
  const publicSrc = resolve(__dirname, 'public');

  return new kibana.Plugin({
    require: ['elasticsearch', 'xpack_main'],
    id: 'searchprofiler',
    configPrefix: 'xpack.searchprofiler',
    publicDir: publicSrc,

    uiExports: {
      devTools: ['plugins/searchprofiler/legacy.ts'],
      hacks: ['plugins/searchprofiler/register.js'],
      home: ['plugins/searchprofiler/register_feature.js'],
      styleSheetPaths: `${publicSrc}/np_ready/application/index.scss`,
    },
    init(server: any) {
      const thisPlugin = this;
      const xpackMainPlugin = server.plugins.xpack_main;
      mirrorPluginStatus(xpackMainPlugin, thisPlugin);
      xpackMainPlugin.status.once('green', () => {
        // Register a function that is called whenever the xpack info changes,
        // to re-compute the license check results for this plugin
        xpackMainPlugin.info
          .feature(thisPlugin.id)
          .registerLicenseCheckResultsGenerator(checkLicense);
      });

      // Add server routes and initialize the plugin here
      const commonRouteConfig = {
        pre: [
          function forbidApiAccess() {
            const licenseCheckResults = xpackMainPlugin.info
              .feature(thisPlugin.id)
              .getLicenseCheckResults();
            if (licenseCheckResults.showAppLink && licenseCheckResults.enableAppLink) {
              return null;
            } else {
              throw Boom.forbidden(licenseCheckResults.message);
            }
          },
        ],
      };
      profileRoute(server, commonRouteConfig);
    },
  });
};
