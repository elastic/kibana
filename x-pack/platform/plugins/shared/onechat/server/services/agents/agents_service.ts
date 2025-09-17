/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  SecurityServiceStart,
  ElasticsearchServiceStart,
  KibanaRequest,
} from '@kbn/core/server';
import type { Runner } from '@kbn/onechat-server';
import type { AgentsServiceSetup, AgentsServiceStart } from './types';
import type { ToolsServiceStart } from '../tools';
import {
  createBuiltinAgentRegistry,
  createBuiltinProviderFn,
  type BuiltinAgentRegistry,
} from './builtin';
import { createPersistedProviderFn } from './persisted';
import { createAgentRegistry } from './agent_registry';

export interface AgentsServiceSetupDeps {
  logger: Logger;
}

export interface AgentsServiceStartDeps {
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  getRunner: () => Runner;
  toolsService: ToolsServiceStart;
}

export class AgentsService {
  private builtinRegistry: BuiltinAgentRegistry;

  private setupDeps?: AgentsServiceSetupDeps;

  constructor() {
    this.builtinRegistry = createBuiltinAgentRegistry();
  }

  setup(setupDeps: AgentsServiceSetupDeps): AgentsServiceSetup {
    this.setupDeps = setupDeps;
    return {
      register: (agent) => this.builtinRegistry.register(agent),
    };
  }

  start(startDeps: AgentsServiceStartDeps): AgentsServiceStart {
    if (!this.setupDeps) {
      throw new Error('#start called before #setup');
    }

    const { logger } = this.setupDeps;
    const { getRunner, security, elasticsearch, toolsService } = startDeps;

    const builtinProviderFn = createBuiltinProviderFn({ registry: this.builtinRegistry });
    const persistedProviderFn = createPersistedProviderFn({
      elasticsearch,
      security,
      toolsService,
      logger,
    });

    const getRegistry = async ({ request }: { request: KibanaRequest }) => {
      return createAgentRegistry({
        request,
        builtinProvider: await builtinProviderFn({ request }),
        persistedProvider: await persistedProviderFn({ request }),
      });
    };

    return {
      getRegistry,
      execute: async (args) => {
        return getRunner().runAgent(args);
      },
    };
  }
}
