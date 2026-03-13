/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ToolType } from '@kbn/agent-builder-common';
import { createBadRequestError, isToolNotFoundError } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { WritableToolProvider, ToolProviderFn } from '../tool_provider';
import type { AnyToolTypeDefinition, ToolTypeDefinition } from '../tool_types/definitions';
import { isEnabledDefinition } from '../tool_types/definitions';
import { createClient } from './client';
import type {
  ToolTypeValidatorContext,
  ToolTypeConversionContext,
} from '../tool_types/definitions';
import { convertPersistedDefinition } from './converter';

export const createPersistedProviderFn =
  (opts: {
    logger: Logger;
    esClient: ElasticsearchClient;
    toolTypes: AnyToolTypeDefinition[];
  }): ToolProviderFn<false> =>
  ({ request, space }) => {
    return createPersistedToolClient({
      ...opts,
      request,
      space,
    });
  };

export const createPersistedToolClient = ({
  request,
  toolTypes,
  logger,
  esClient,
  space,
}: {
  toolTypes: AnyToolTypeDefinition[];
  logger: Logger;
  esClient: ElasticsearchClient;
  space: string;
  request: KibanaRequest;
}): WritableToolProvider => {
  const toolClient = createClient({ space, esClient, logger });
  const definitionMap = toolTypes.filter(isEnabledDefinition).reduce((map, def) => {
    map[def.toolType] = def;
    return map;
  }, {} as Record<ToolType, ToolTypeDefinition>);

  const validationContext = (): ToolTypeValidatorContext => {
    return {
      esClient,
      request,
      spaceId: space,
    };
  };

  const conversionContext = (): ToolTypeConversionContext => {
    return {
      esClient,
      request,
      spaceId: space,
    };
  };

  return {
    id: 'persisted',
    readonly: false,

    async has(toolId: string) {
      try {
        await toolClient.get(toolId);
        return true;
      } catch (e) {
        if (isToolNotFoundError(e)) {
          return false;
        }
        throw e;
      }
    },

    async get(toolId) {
      const tool = await toolClient.get(toolId);
      const definition = definitionMap[tool.type];
      if (!definition) {
        throw createBadRequestError(`Unknown type for tool '${toolId}': '${tool.type}'`);
      }
      return convertPersistedDefinition({ tool, definition, context: conversionContext() });
    },

    async list() {
      const tools = await toolClient.list();
      const context = conversionContext();
      return tools
        .filter((tool) => {
          // evict unknown tools - atm it's used for workflow tools if the plugin is disabled.
          return definitionMap[tool.type];
        })
        .map((tool) => {
          const definition = definitionMap[tool.type]!;
          return convertPersistedDefinition({ tool, definition, context });
        });
    },

    async create(createRequest) {
      const definition = definitionMap[createRequest.type];
      if (!definition) {
        throw createBadRequestError(`Unknown tool type: '${createRequest.type}'`);
      }

      try {
        definition.createSchema.validate(createRequest.configuration);
      } catch (e) {
        throw createBadRequestError(
          `Invalid configuration for tool type ${createRequest.type}: ${e.message}`
        );
      }

      let updatedConfig: Record<string, unknown>;
      try {
        updatedConfig = await definition.validateForCreate({
          config: createRequest.configuration,
          context: validationContext(),
        });
      } catch (e) {
        throw createBadRequestError(
          `Invalid configuration for tool type ${createRequest.type}: ${e.message}`
        );
      }

      const persistedConfig = definition.convertToPersistence
        ? definition.convertToPersistence(updatedConfig as any, conversionContext())
        : updatedConfig;

      const mergedRequest = {
        ...createRequest,
        configuration: persistedConfig,
      };

      const tool = await toolClient.create(mergedRequest);

      return convertPersistedDefinition({ tool, definition, context: conversionContext() });
    },

    async update(toolId, updateRequest) {
      const existingTool = await this.get(toolId);
      const definition = definitionMap[existingTool.type];
      if (!definition) {
        throw createBadRequestError(`Unknown tool type: '${existingTool.type}'`);
      }

      try {
        definition.updateSchema.validate(updateRequest.configuration);
      } catch (e) {
        throw createBadRequestError(
          `Invalid configuration for tool type ${existingTool.type}: ${e.message}`
        );
      }

      let updatedConfig: Record<string, unknown>;
      try {
        updatedConfig = await definition.validateForUpdate({
          update: updateRequest.configuration ?? {},
          current: existingTool.configuration,
          context: validationContext(),
        });
      } catch (e) {
        throw createBadRequestError(
          `Invalid configuration for tool type ${existingTool.type}: ${e.message}`
        );
      }

      const persistedConfig = definition.convertToPersistence
        ? definition.convertToPersistence(updatedConfig as any, conversionContext())
        : updatedConfig;

      const mergedConfig = {
        ...updateRequest,
        configuration: persistedConfig,
      };
      const tool = await toolClient.update(toolId, mergedConfig);
      return convertPersistedDefinition({ tool, definition, context: conversionContext() });
    },

    async delete(toolId: string) {
      return toolClient.delete(toolId);
    },
  };
};
