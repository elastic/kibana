/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { init, postInit } from './init';
import { config } from './config';
import { deprecations } from './deprecations';
import { getUiExports } from './ui_exports';

/**
 * Invokes plugin modules to instantiate the Monitoring plugin for Kibana
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Monitoring UI Kibana plugin object
 */
export const monitoring = (kibana) => new kibana.Plugin({
  require: ['kibana', 'elasticsearch', 'xpack_main'],
  id: 'monitoring',
  configPrefix: 'xpack.monitoring',
  publicDir: resolve(__dirname, 'public'),
  init(server, _options) { init(this, server); },
  config,
  deprecations,
  uiExports: getUiExports(),
  postInit(server) {
    postInit(server);
  },
});
