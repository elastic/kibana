/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { npSetup, npStart } from 'ui/new_platform';
import { PluginInitializerContext } from 'src/core/public';
import { SecurityPluginSetup } from '../../../../plugins/security/public';
import { LicensingPluginSetup } from '../../../../plugins/licensing/public';

import { plugin } from '.';

const pluginInstance = plugin({} as PluginInitializerContext);

type PluginsSetupExtended = typeof npSetup.plugins & {
  // adds plugins which aren't in the PluginsSetup interface, but do exist
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
};

const setupDependencies = npSetup.plugins as PluginsSetupExtended;

export const setup = pluginInstance.setup(npSetup.core, {
  data: npStart.plugins.data,
  security: setupDependencies.security,
  licensing: setupDependencies.licensing,
  __LEGACY: {
    XSRF: chrome.getXsrfToken(),
  },
});
export const start = pluginInstance.start(npStart.core, npStart.plugins);
