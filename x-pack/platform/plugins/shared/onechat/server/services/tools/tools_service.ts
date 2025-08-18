/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { Runner } from '@kbn/onechat-server';
import {
  createBuiltinToolRegistry,
  registerBuiltinTools,
  createBuiltInToolTypeDefinition,
  type BuiltinToolRegistry,
} from './builtin';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';
import { createEsqlToolTypeDefinition } from './esql';
import { createToolRegistry } from './tool_registry';

export interface ToolsServiceSetupDeps {
  logger: Logger;
}

export interface ToolsServiceStartDeps {
  getRunner: () => Runner;
  elasticsearch: ElasticsearchServiceStart;
}

export class ToolsService {
  private setupDeps?: ToolsServiceSetupDeps;
  private builtinRegistry: BuiltinToolRegistry;

  constructor() {
    this.builtinRegistry = createBuiltinToolRegistry();
  }

  setup(deps: ToolsServiceSetupDeps): ToolsServiceSetup {
    this.setupDeps = deps;
    registerBuiltinTools({ registry: this.builtinRegistry });

    return {
      register: (reg) => this.builtinRegistry.register(reg),
    };
  }

  start({ getRunner, elasticsearch }: ToolsServiceStartDeps): ToolsServiceStart {
    const { logger } = this.setupDeps!;
    const builtInToolType = createBuiltInToolTypeDefinition({ registry: this.builtinRegistry });
    const esqlToolType = createEsqlToolTypeDefinition({ logger, elasticsearch });

    const getRegistry: ToolsServiceStart['getRegistry'] = async ({ request }) => {
      return createToolRegistry({
        getRunner,
        request,
        typesDefinitions: [builtInToolType, esqlToolType],
      });
    };

    return {
      getRegistry,
    };
  }
}
