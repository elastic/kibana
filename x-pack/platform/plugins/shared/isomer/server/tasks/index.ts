/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import { createIsomerRuntimeProvider } from '../runtime';
import type { IsomerPluginSetup, IsomerPluginStart } from '../plugin';

/** The Isomer runtime for task runtimes: the same provider the plugin uses, built on first use. */
class IsomerTasksPlugin implements TasksPlugin<IsomerPluginSetup, IsomerPluginStart> {
  private readonly runtimeProvider: ReturnType<typeof createIsomerRuntimeProvider>;

  constructor(context: PluginInitializerContext) {
    this.runtimeProvider = createIsomerRuntimeProvider(context.logger.get());
  }

  setup(): IsomerPluginSetup {
    return {};
  }

  start(): IsomerPluginStart {
    return { getRuntime: this.runtimeProvider.getRuntime };
  }
}

export const plugin = async (context: PluginInitializerContext) => new IsomerTasksPlugin(context);
