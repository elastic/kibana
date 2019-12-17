/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from '../../../../../../src/core/public';
import { ApmPlugin, ApmPluginSetup, ApmPluginStart } from './plugin';

export const plugin: PluginInitializer<
  ApmPluginSetup,
  ApmPluginStart
> = pluginInitializerContext => new ApmPlugin(pluginInitializerContext);
