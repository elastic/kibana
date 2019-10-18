/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { npSetup, npStart } from 'ui/new_platform';

import { plugin } from './index';
import { KueryAutocompletePluginSetupDependencies } from './plugin';

const plugins: Readonly<KueryAutocompletePluginSetupDependencies> = {
  data: npSetup.plugins.data,
};

const pluginInstance = plugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, plugins);
export const start = pluginInstance.start(npStart.core);
