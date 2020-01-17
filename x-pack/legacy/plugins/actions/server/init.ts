/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { PluginStartContract } from '../../../../plugins/actions/server';

export function getActionsPlugin(server: Legacy.Server): PluginStartContract | undefined {
  return server?.newPlatform?.start?.plugins?.actions as PluginStartContract;
}

export async function init(server: Legacy.Server) {
  server.decorate('request', 'getActionsClient', function() {
    // const actions = getActionsPlugin(server);
    // return actions?.getActionsClientWithRequest(this);
  });
}
