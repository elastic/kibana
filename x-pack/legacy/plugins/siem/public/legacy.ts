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

pluginInstance.setup(npSetup.core, {
  ...npSetup.plugins,
  triggers_actions_ui: ((npSetup.plugins as unknown) as {
    triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  }).triggers_actions_ui,
});
pluginInstance.start(npStart.core, {
  ...npStart.plugins,
  triggers_actions_ui: ((npStart.plugins as unknown) as {
    triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
  }).triggers_actions_ui,
});
