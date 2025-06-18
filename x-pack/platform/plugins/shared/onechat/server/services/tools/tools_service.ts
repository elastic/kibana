/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { builtinToolProviderId } from '@kbn/onechat-common';
import type { Runner, RegisteredTool } from '@kbn/onechat-server';
import { createBuiltinToolRegistry, type BuiltinToolRegistry } from './builtin_registry';
import type { ToolsServiceSetup, ToolsServiceStart, RegisteredToolProviderWithId } from './types';
import { createInternalRegistry } from './utils';

export interface ToolsServiceStartDeps {
  getRunner: () => Runner;
}

export class ToolsService {
  private builtinRegistry: BuiltinToolRegistry;
  private providers: Map<string, RegisteredToolProviderWithId> = new Map();

  constructor() {
    this.builtinRegistry = createBuiltinToolRegistry();
    this.providers.set(builtinToolProviderId, this.builtinRegistry);
  }

  setup(): ToolsServiceSetup {
    return {
      register: (reg) => this.register(reg),
      registerProvider: (providerId, provider) => {
        if (this.providers.has(providerId)) {
          throw new Error(`Provider with id ${providerId} already registered`);
        }
        this.providers.set(providerId, { ...provider, id: providerId });
      },
    };
  }

  start({ getRunner }: ToolsServiceStartDeps): ToolsServiceStart {
    const registry = createInternalRegistry({
      providers: [...this.providers.values()],
      getRunner,
    });

    return {
      registry,
    };
  }

  private register(toolRegistration: RegisteredTool<any, any>) {
    this.builtinRegistry.register(toolRegistration);
  }
}
