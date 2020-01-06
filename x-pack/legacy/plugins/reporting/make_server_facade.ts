/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from './types';

export function makeServerFacade(server: ServerFacade): ServerFacade {
  return {
    config: server.config,
    info: server.info,
    route: server.route.bind(server),
    newPlatform: server.newPlatform,
    plugins: {
      elasticsearch: server.plugins.elasticsearch,
      xpack_main: server.plugins.xpack_main,
      security: server.plugins.security,
    },
    savedObjects: server.savedObjects,
    uiSettingsServiceFactory: server.uiSettingsServiceFactory,
    log: server.log.bind(server),
  };
}
