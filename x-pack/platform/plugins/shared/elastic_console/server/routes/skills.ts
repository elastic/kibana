/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { schema } from '@kbn/config-schema';
import { ToolType } from '@kbn/agent-builder-common';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { isElasticConsoleEnabled } from './is_enabled';

const convertInlineToolSchema = (tool: SkillBoundedTool) => {
  if (tool.type === ToolType.builtin && 'schema' in tool) {
    const { $schema: _, ...rest } = z.toJSONSchema(tool.schema, {
      unrepresentable: 'any',
      io: 'input',
    }) as Record<string, unknown>;
    return rest;
  }
  return undefined;
};

const serializeInlineTool = (tool: SkillBoundedTool) => {
  const jsonSchema = convertInlineToolSchema(tool);

  const base: Record<string, unknown> = {
    id: tool.id,
    type: tool.type,
    description: tool.description,
  };

  if (jsonSchema) {
    base.schema = jsonSchema;
  }

  if ('configuration' in tool && tool.configuration) {
    base.configuration = tool.configuration;
  }

  return base;
};

export const registerSkillRoutes = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  // List skills
  router.get(
    {
      path: '/internal/elastic_console/skills',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {},
    },
    async (ctx, request, response) => {
      try {
        const [coreStart, { agentBuilder }] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        if (!agentBuilder) {
          return response.notFound();
        }

        const skillRegistry = await agentBuilder.skills.getRegistry({ request });
        const skills = await skillRegistry.list();

        const results = await Promise.all(
          skills.map(async (skill) => ({
            id: skill.id,
            name: skill.name,
            description: skill.description,
            readonly: skill.readonly,
            plugin_id: skill.plugin_id,
            tool_ids: await skill.getRegistryTools(),
            inline_tool_count: ((await skill.getInlineTools?.()) ?? []).length,
            referenced_content_count: skill.referencedContentCount,
          }))
        );

        return response.ok({ body: { results } });
      } catch (error) {
        logger.error(`List skills error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Get single skill with full tool definitions
  router.get(
    {
      path: '/internal/elastic_console/skills/{skillId}',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          skillId: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart, { agentBuilder }] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        if (!agentBuilder) {
          return response.notFound();
        }

        const skillRegistry = await agentBuilder.skills.getRegistry({ request });
        const skill = await skillRegistry.get(request.params.skillId);

        if (!skill) {
          return response.notFound();
        }

        const registryToolIds = await skill.getRegistryTools();
        const inlineTools = (await skill.getInlineTools?.()) ?? [];

        // Fetch registry tool definitions with schemas
        const toolRegistry = await agentBuilder.tools.getRegistry({ request });
        const registryTools = await Promise.all(
          registryToolIds.map(async (toolId) => {
            try {
              const tool = await toolRegistry.get(toolId);
              const toolSchema = await tool.getSchema();
              const { $schema: _, ...rest } = z.toJSONSchema(toolSchema, {
                unrepresentable: 'any',
                io: 'input',
              }) as Record<string, unknown>;

              return {
                id: tool.id,
                type: tool.type,
                description: tool.description,
                configuration: tool.configuration,
                readonly: tool.readonly,
                schema: rest,
              };
            } catch (err) {
              logger.warn(`Failed to fetch registry tool ${toolId}: ${err.message}`);
              return { id: toolId, error: 'not_found' };
            }
          })
        );

        return response.ok({
          body: {
            id: skill.id,
            name: skill.name,
            description: skill.description,
            content: skill.content,
            readonly: skill.readonly,
            plugin_id: skill.plugin_id,
            referenced_content_count: skill.referencedContentCount,
            registry_tools: registryTools,
            inline_tools: inlineTools.map(serializeInlineTool),
          },
        });
      } catch (error) {
        logger.error(`Get skill error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Execute a skill tool
  router.post(
    {
      path: '/internal/elastic_console/skills/{skillId}/tools/_execute',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          skillId: schema.string(),
        }),
        body: schema.object({
          tool_id: schema.string(),
          tool_params: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart, { agentBuilder }] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        if (!agentBuilder) {
          return response.notFound();
        }

        const result = await agentBuilder.tools.executeSkillTool({
          request,
          skillId: request.params.skillId,
          toolId: request.body.tool_id,
          toolParams: request.body.tool_params,
        });

        return response.ok({ body: result });
      } catch (error) {
        logger.error(`Execute skill tool error: ${error.message}`);
        if (error.statusCode === 404) {
          return response.notFound({ body: { message: error.message } });
        }
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );
};
