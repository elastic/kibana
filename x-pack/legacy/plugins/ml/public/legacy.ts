/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { npSetup, npStart } from 'ui/new_platform';

import { PluginInitializerContext } from 'src/core/public';
import { plugin } from '.';

const pluginInstance = plugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, {
  data: npStart.plugins.data,
  __LEGACY: {
    XSRF: chrome.getXsrfToken(),
    // @ts-ignore getAppUrl is missing from chrome's definition
    APP_URL: chrome.getAppUrl(),
  },
});
export const start = pluginInstance.start(npStart.core, npStart.plugins);
