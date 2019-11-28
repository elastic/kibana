/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { mirrorPluginStatus } from '../../../server/lib/mirror_plugin_status';
import { checkLicense } from './lib';
import { graphExploreRoute, searchProxyRoute } from './routes';

export function initServer(server) {
  const graphPlugin = server.plugins.graph;
  const xpackMainPlugin = server.plugins.xpack_main;

  mirrorPluginStatus(xpackMainPlugin, graphPlugin);
  xpackMainPlugin.status.once('green', () => {
    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results
    xpackMainPlugin.info.feature('graph').registerLicenseCheckResultsGenerator(checkLicense);
  });

  server.route(graphExploreRoute);
  server.route(searchProxyRoute);
}
