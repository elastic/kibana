/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Plugin } from './server/plugin';
import { createSetupShim } from './server/shim';

export const init = async function(server: Legacy.Server) {
  const { coreSetup, pluginsSetup } = await createSetupShim(server);
  const serverPlugin = new Plugin();

  serverPlugin.setup(coreSetup, pluginsSetup);
};
