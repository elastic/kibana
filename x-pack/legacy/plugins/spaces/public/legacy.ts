/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerSettingsComponent } from 'ui/management';
import { npSetup, npStart } from 'ui/new_platform';
import { setup as managementSetup } from '../../../../../src/legacy/core_plugins/management/public/legacy';
import { plugin } from '.';
import { SpacesPlugin, PluginsSetup, PluginsStart } from './plugin';
import './management/legacy_page_routes';

const spacesPlugin: SpacesPlugin = plugin();

const pluginsSetup: PluginsSetup = {
  home: npSetup.plugins.home,
  management: managementSetup,
  __managementLegacyCompat: {
    registerSettingsComponent,
  },
};

const pluginsStart: PluginsStart = {
  management: npStart.plugins.management,
};

export const setup = spacesPlugin.setup(npSetup.core, pluginsSetup);
export const start = spacesPlugin.start(npStart.core, pluginsStart);
