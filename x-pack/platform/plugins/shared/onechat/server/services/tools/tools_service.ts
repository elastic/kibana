/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuiltinToolRegistry, ToolRegistration } from './builtin_registry';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';

export class ToolsService {
  private builtinRegistry: BuiltinToolRegistry;

  constructor() {
    this.builtinRegistry = new BuiltinToolRegistry();
  }

  setup(): ToolsServiceSetup {
    return {
      register: (reg) => this.register(reg),
    };
  }

  start(): ToolsServiceStart {
    return {};
  }

  private register(toolRegistration: ToolRegistration) {
    this.builtinRegistry.register(toolRegistration);
  }
}
