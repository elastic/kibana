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

// import { setup as fooSetup, start as fooStart } from '../../foo/public/legacy'; // assumes `foo` lives in `legacy/core_plugins`

const pluginInstance = plugin({} as PluginInitializerContext);
// const __LEGACYSetup = {
//   bar: {}, // shim for a core service that hasn't migrated yet
//   foo: fooSetup, // dependency on a legacy plugin
// };
// const __LEGACYStart = {
//   bar: {}, // shim for a core service that hasn't migrated yet
//   foo: fooStart, // dependency on a legacy plugin
// };

export const setup = pluginInstance.setup(npSetup.core, {
  data,
  navigation,
  npData: npStart.plugins.data,
});
export const start = pluginInstance.start(npStart.core, npStart.plugins);
// export const setup = pluginInstance.setup(npSetup.core, npSetup.plugins, __LEGACYSetup);
// export const start = pluginInstance.start(npStart.core, npStart.plugins, __LEGACYStart);
