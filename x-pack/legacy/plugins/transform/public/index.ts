/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TransformPlugin } from './plugin';
import { createPublicStartShim, createPublicSetupShim } from './shim';

function createPlugin() {
  const transformPlugin = new TransformPlugin();
  const setupShim = createPublicSetupShim();
  const startShim = createPublicStartShim();
  transformPlugin.setup(setupShim.core, setupShim.plugins);
  transformPlugin.start(startShim.core, startShim.plugins);
}

createPlugin();
