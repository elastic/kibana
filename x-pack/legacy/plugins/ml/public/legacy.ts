/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { start as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';
import { start as navigation } from '../../../../../src/legacy/core_plugins/navigation/public/legacy';

import { PluginInitializerContext } from '../../../../../src/core/public';
import { plugin } from '.';

const pluginInstance = plugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, {
  data,
  navigation,
  npData: npStart.plugins.data,
});
export const start = pluginInstance.start(npStart.core, npStart.plugins);
