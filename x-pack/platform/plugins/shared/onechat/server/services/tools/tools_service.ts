/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runner, RegisteredTool } from '@kbn/onechat-server';
import { createBuiltinToolRegistry, type BuiltinToolRegistry } from './builtin_registry';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';
import { createInternalRegistry } from './utils';

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
    const registry = createInternalRegistry({ providers: [this.builtinRegistry], getRunner });

    return {
      registry,
    };
  }

  private register(toolRegistration: RegisteredTool<any, any>) {
    this.builtinRegistry.register(toolRegistration);
  }
}
