/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runner } from '@kbn/onechat-server';
import {
  createBuiltinToolRegistry,
  type BuiltinToolRegistry,
  type ToolRegistration,
} from './builtin_registry';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';
import {
  combineToolProviders,
  toolProviderToPublicRegistryFactory,
  builtinRegistryToProvider,
} from './utils';

export interface ToolsServiceStartDeps {
  getRunner: () => Runner;
}

export class ToolsService {
  private builtinRegistry: BuiltinToolRegistry;

  constructor() {
    this.builtinRegistry = createBuiltinToolRegistry();
  }

  setup(): ToolsServiceSetup {
    return {
      register: (reg) => this.register(reg),
    };
  }

  start({ getRunner }: ToolsServiceStartDeps): ToolsServiceStart {
    const builtinProvider = builtinRegistryToProvider({
      registry: this.builtinRegistry,
      getRunner,
    });
    const toolProvider = combineToolProviders(builtinProvider);

    return {
      registry: toolProvider,
      getScopedRegistry: toolProviderToPublicRegistryFactory({ provider: toolProvider }),
    };
  }

  private register(toolRegistration: ToolRegistration) {
    this.builtinRegistry.register(toolRegistration);
  }
}
