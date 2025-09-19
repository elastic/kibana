/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';

export function registerWorkflowRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  // GET /api/onechat/workflows/autocomplete
  router.get(
    {
      path: '/api/onechat/workflows/autocomplete',
      validate: {
        query: schema.object({
          query: schema.maybe(schema.string()),
          limit: schema.maybe(schema.number({ min: 1, max: 50, defaultValue: 10 })),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is used for workflow autocompletion and requires no authorization',
        },
      },
    },
    async (context, request, response) => {
      try {
        const { query, limit = 10 } = request.query;

        // Get the tools service to access workflow tools
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });
        const tools = await registry.list({});

        // Find workflow tools
        const workflowTools = tools.filter(
          (tool) => tool.id.includes('workflow') || tool.tags?.includes('workflows')
        );

        // If we have workflow management available, get actual workflows
        let workflows: Array<{
          id: string;
          name: string;
          description?: string;
          enabled: boolean;
        }> = [];

        // Try to execute the list_workflows tool to get actual workflows
        try {
          const listWorkflowsTool = tools.find((tool) => tool.id === 'list_workflows');
          if (listWorkflowsTool) {
            const searchQuery = query || '';
            const result = await registry.execute({
              toolId: 'list_workflows',
              toolParams: {
                query: searchQuery,
                enabled: true,
              },
            });

            // Extract workflows from tool result
            const toolResultData = result?.results?.[0]?.data;
            if (
              toolResultData &&
              'workflows' in toolResultData &&
              Array.isArray(toolResultData.workflows)
            ) {
              workflows = toolResultData.workflows
                .filter((workflow: any) => workflow.enabled)
                .slice(0, limit)
                .map((workflow: any) => ({
                  id: workflow.id,
                  name: workflow.name,
                  description: workflow.description,
                  enabled: workflow.enabled,
                  inputs: workflow.inputs || [],
                }));
            }
          }
        } catch (error) {
          logger.debug('Could not fetch workflows for autocompletion:', error);
        }

        // If no workflows found but we have workflow tools, return tool suggestions
        if (workflows.length === 0 && workflowTools.length > 0) {
          workflows = [
            {
              id: 'list-workflows',
              name: 'List Workflows',
              description: 'Show all available workflows',
              enabled: true,
            },
            {
              id: 'workflow-help',
              name: 'Workflow Help',
              description: 'Get help with workflow commands',
              enabled: true,
            },
          ];
        }

        return response.ok({
          body: {
            workflows,
            hasWorkflowSupport: workflowTools.length > 0,
          },
        });
      } catch (error) {
        logger.error('Error in workflow autocomplete:', error);
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to fetch workflow suggestions',
          },
        });
      }
    }
  );
}