/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { init } from './init';
import { config } from './config';

/**
 * Invokes plugin modules to instantiate the Notification plugin for Kibana
 *
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Notification Kibana plugin object
 */
export const notifications = (kibana) => new kibana.Plugin({
  require: ['kibana', 'xpack_main'],
  id: 'notifications',
  configPrefix: 'xpack.notifications',
  publicDir: resolve(__dirname, 'public'),
  init,
  config,
});
