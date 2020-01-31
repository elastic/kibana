/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { profileRoute } from './server/routes/profile';

// License
import Boom from 'boom';
import { checkLicense } from './server/lib/check_license';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';

export const searchprofiler = kibana => {
  return new kibana.Plugin({
    require: ['elasticsearch', 'xpack_main'],
    id: 'searchprofiler',
    configPrefix: 'xpack.searchprofiler',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      devTools: ['plugins/searchprofiler/app'],
      hacks: ['plugins/searchprofiler/register'],
      home: ['plugins/searchprofiler/register_feature'],
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    },
    init: function(server) {
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
