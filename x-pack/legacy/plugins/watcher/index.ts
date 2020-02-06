/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { resolve } from 'path';

const pluginDefinition = {
  id: 'watcher',
  configPrefix: 'xpack.watcher',
  publicDir: resolve(__dirname, 'public'),
  require: ['kibana'],
  uiExports: {
    styleSheetPaths: resolve(__dirname, 'public/index.scss'),
  },
  init(server: any) {},
};

export const watcher = (kibana: any) => new kibana.Plugin(pluginDefinition);
