/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { plugin } from './index';
import { SpacesPlugin, PluginsSetup } from './plugin';

const spacesPlugin: SpacesPlugin = plugin({
  opaqueId: Symbol('spaces plugin'),
  env: null as any,
});

const plugins: PluginsSetup = {
  feature_catalogue: npSetup.plugins.feature_catalogue,
};

export const setup = spacesPlugin.setup(npSetup.core, plugins);
export const start = spacesPlugin.start(npStart.core);
