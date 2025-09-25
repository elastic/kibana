/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { Runner } from '@kbn/onechat-server';
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';
import { isAllowedBuiltinTool } from '@kbn/onechat-server/allow_lists';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ToolTypeInfo } from '../../../common/tools';
import { getCurrentSpaceId } from '../../utils/spaces';
import {
  createBuiltinToolRegistry,
  registerBuiltinTools,
  createBuiltInToolSource,
  type BuiltinToolRegistry,
} from './builtin';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';
import { createPersistedToolSource } from './persisted';
import { createToolRegistry } from './tool_registry';

export interface ToolsServiceSetupDeps {
  logger: Logger;
  workflowsManagement?: WorkflowsPluginSetup;
}

export interface ToolsServiceStartDeps {
  getRunner: () => Runner;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
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
      register: (reg) => {
        if (!isAllowedBuiltinTool(reg.id)) {
          throw new Error(
            `Built-in tool with id "${reg.id}" is not in the list of allowed built-in tools.
             Please add it to the list of allowed built-in tools in the "@kbn/onechat-server/allow_lists.ts" file.`
          );
        }
        return this.builtinRegistry.register(reg);
      },
    };
  }

  start({ getRunner, elasticsearch, spaces }: ToolsServiceStartDeps): ToolsServiceStart {
    const { logger, workflowsManagement } = this.setupDeps!;
    const builtInToolSource = createBuiltInToolSource({ registry: this.builtinRegistry });
    const persistedToolSource = createPersistedToolSource({
      logger,
      elasticsearch,
      workflowsManagement,
    });

    const getRegistry: ToolsServiceStart['getRegistry'] = async ({ request }) => {
      const space = getCurrentSpaceId({ request, spaces });

      return createToolRegistry({
        getRunner,
        space,
        request,
        toolSources: [builtInToolSource, persistedToolSource],
      });
    };

    const getToolTypeInfo = () => {
      return [
        ...persistedToolSource.toolTypes.map<ToolTypeInfo>((typeDef) => {
          return { type: typeDef, create: true };
        }),
        ...builtInToolSource.toolTypes.map<ToolTypeInfo>((typeDef) => {
          return { type: typeDef, create: false };
        }),
      ];
    };

    return {
      getRegistry,
      getToolTypeInfo,
    };
  }
}
