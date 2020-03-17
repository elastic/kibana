/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { PluginsSetup, PluginsStart } from 'ui/new_platform/new_platform';

import { PluginInitializerContext } from '../../../../../src/core/public';
import { plugin } from './';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../../plugins/triggers_actions_ui/public';

const pluginInstance = plugin({} as PluginInitializerContext);

type myPluginsSetup = PluginsSetup & { triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup };
type myPluginsStart = PluginsStart & { triggers_actions_ui: TriggersAndActionsUIPublicPluginStart };

pluginInstance.setup(npSetup.core, npSetup.plugins as myPluginsSetup);
pluginInstance.start(npStart.core, npStart.plugins as myPluginsStart);
