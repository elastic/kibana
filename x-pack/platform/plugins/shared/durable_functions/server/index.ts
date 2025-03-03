/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import {
  DurableFunctionsAppPlugin,
  type DurableFunctionsSetupContract,
  type DurableFunctionsSetup,
  type DurableFunctionsStartContract,
  type DurableFunctionsStart,
} from './plugin';

export type { DurableFunctionsSetupContract, DurableFunctionsStartContract };

export const plugin: PluginInitializer<
  DurableFunctionsSetupContract,
  DurableFunctionsStartContract,
  DurableFunctionsSetup,
  DurableFunctionsStart
> = async (pluginInitializerContext: PluginInitializerContext<{}>) => {
  return new DurableFunctionsAppPlugin(pluginInitializerContext);
};
