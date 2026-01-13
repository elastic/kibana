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
  UiSettingsServiceStart,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { isAllowedBuiltinAgent } from '@kbn/agent-builder-server/allow_lists';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { Runner } from '@kbn/agent-builder-server';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AgentsServiceSetup, AgentsServiceStart } from './types';
import type { ToolsServiceStart } from '../tools';
import {
  createBuiltinAgentRegistry,
  createBuiltinProviderFn,
  registerBuiltinAgents,
  type BuiltinAgentRegistry,
} from './builtin';
import { createPersistedProviderFn } from './persisted';
import { createAgentRegistry } from './agent_registry';

export interface AgentsServiceSetupDeps {
  logger: Logger;
}

export interface AgentsServiceStartDeps {
  security: SecurityServiceStart;
  spaces?: SpacesPluginStart;
  elasticsearch: ElasticsearchServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
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

    registerBuiltinAgents({ registry: this.builtinRegistry });

    return {
      register: (agent) => {
        if (!isAllowedBuiltinAgent(agent.id)) {
          throw new Error(`Built-in agent with id "${agent.id}" is not in the list of allowed built-in agents.
             Please add it to the list of allowed built-in agents in the "@kbn/agent-builder-server/allow_lists.ts" file.`);
        }
        this.builtinRegistry.register(agent);
      },
    };
  }

  start(startDeps: AgentsServiceStartDeps): AgentsServiceStart {
    if (!this.setupDeps) {
      throw new Error('#start called before #setup');
    }

    const { logger } = this.setupDeps;
    const { getRunner, security, elasticsearch, spaces, toolsService, uiSettings, savedObjects } =
      startDeps;

    const builtinProviderFn = createBuiltinProviderFn({ registry: this.builtinRegistry });
    const persistedProviderFn = createPersistedProviderFn({
      elasticsearch,
      security,
      toolsService,
      logger,
    });

    const getRegistry = async ({ request }: { request: KibanaRequest }) => {
      const space = getCurrentSpaceId({ request, spaces });
      return createAgentRegistry({
        request,
        spaceId: space,
        uiSettings,
        savedObjects,
        builtinProvider: await builtinProviderFn({ request, space }),
        persistedProvider: await persistedProviderFn({ request, space }),
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
