/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
// @ts-ignore Untyped Module
import { uiModules } from 'ui/modules';
import { plugin } from '.';

const pluginInstance = plugin();

const setupPlugins = {
  __LEGACY: {
    uiModules,
  },
  np: npSetup.plugins,
};

export const setup = pluginInstance.setup(npSetup.core, setupPlugins);
export const start = pluginInstance.start(npStart.core, npStart.plugins);
