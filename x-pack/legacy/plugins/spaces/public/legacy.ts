/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { plugin } from '.';
import { SpacesPlugin, PluginsSetup } from './plugin';

const spacesPlugin: SpacesPlugin = plugin();

const plugins: PluginsSetup = {
  home: npSetup.plugins.home,
};

export const setup = spacesPlugin.setup(npSetup.core, plugins);
export const start = spacesPlugin.start(npStart.core);
