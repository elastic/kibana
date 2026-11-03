/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { KibanaIsomerRuntime } from '@kbn/isomer';
import { createIsomerRuntimeProvider } from './runtime';

export type IsomerPluginSetup = Record<string, never>;

export interface IsomerPluginStart {
  /** Loads the shared runtime and primitive packs on first use. */
  getRuntime: () => Promise<KibanaIsomerRuntime>;
}

export class IsomerPlugin implements Plugin<IsomerPluginSetup, IsomerPluginStart> {
  private readonly runtimeProvider: ReturnType<typeof createIsomerRuntimeProvider>;

  constructor(initializerContext: PluginInitializerContext) {
    this.runtimeProvider = createIsomerRuntimeProvider(initializerContext.logger.get());
  }

  setup(): IsomerPluginSetup {
    return {};
  }

  start(): IsomerPluginStart {
    return { getRuntime: this.runtimeProvider.getRuntime };
  }

  stop() {}
}
