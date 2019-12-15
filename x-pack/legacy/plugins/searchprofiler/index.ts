/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import Boom from 'boom';

import { CoreSetup } from 'src/core/server';
import { Server } from 'src/legacy/server/kbn_server';
import { LegacySetup } from './server/np_ready/types';
import { plugin } from './server/np_ready';

export const searchprofiler = (kibana: any) => {
  const publicSrc = resolve(__dirname, 'public');

  return new kibana.Plugin({
    require: ['elasticsearch', 'xpack_main'],
    id: 'searchprofiler',
    configPrefix: 'xpack.searchprofiler',
    publicDir: publicSrc,

    uiExports: {
      // NP Ready
      devTools: [`${publicSrc}/legacy`],
      styleSheetPaths: `${publicSrc}/np_ready/application/index.scss`,
      // Legacy
      home: ['plugins/searchprofiler/register_feature'],
    },
    init(server: Server) {
      const serverPlugin = plugin();
      const thisPlugin = this;

      const commonRouteConfig = {
        pre: [
          function forbidApiAccess() {
            const licenseCheckResults = server.plugins.xpack_main.info
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

      const legacySetup: LegacySetup = {
        route: (args: Parameters<typeof server.route>[0]) => server.route(args),
        plugins: {
          __LEGACY: {
            thisPlugin,
            xpackMain: server.plugins.xpack_main,
            elasticsearch: server.plugins.elasticsearch,
            commonRouteConfig,
          },
        },
      };
      serverPlugin.setup({} as CoreSetup, legacySetup);
    },
  });
};
