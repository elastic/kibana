/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';

import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../../plugins/triggers_actions_ui/public';
import { PluginInitializerContext } from '../../../../../src/core/public';
import { plugin } from './';

const pluginInstance = plugin({} as PluginInitializerContext);

type PluginsSetupExtended = typeof npSetup.plugins & {
  // adds plugins which aren't in the PluginsSetup interface, but do exist
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
};

type PluginsStartExtended = typeof npStart.plugins & {
  // adds plugins which aren't in the PluginsSetup interface, but do exist
  triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
};

const setupDependencies = npSetup.plugins as PluginsSetupExtended;
const startDependencies = npStart.plugins as PluginsStartExtended;

pluginInstance.setup(npSetup.core, {
  ...npSetup.plugins,
  triggers_actions_ui: setupDependencies.triggers_actions_ui,
});
pluginInstance.start(npStart.core, {
  ...npStart.plugins,
  triggers_actions_ui: startDependencies.triggers_actions_ui,
});
