/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { npSetup, npStart } from 'ui/new_platform';
import { PluginInitializerContext } from 'src/core/public';
import { SecurityPluginSetup } from '../../../../plugins/security/public';

import { plugin } from '.';

const pluginInstance = plugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, {
  data: npStart.plugins.data,
  security: ((npSetup.plugins as unknown) as { security: SecurityPluginSetup }).security, // security isn't in the PluginsSetup interface, but does exist
  __LEGACY: {
    XSRF: chrome.getXsrfToken(),
  },
});
export const start = pluginInstance.start(npStart.core, npStart.plugins);
