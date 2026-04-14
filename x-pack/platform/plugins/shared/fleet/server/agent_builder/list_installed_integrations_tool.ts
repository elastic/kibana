/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { CoreSetup } from '@kbn/core/server';

import type { FleetStartContract, FleetStartDeps } from '../plugin';

export const FLEET_LIST_INSTALLED_INTEGRATIONS_TOOL_ID = 'fleet.list_installed_integrations';

const PER_PAGE = 50;

const listInstalledIntegrationsSchema = z.object({
  nameQuery: z
    .string()
    .optional()
    .describe(
      'Optional search query to filter integrations by name. Only use if the user specified a name to search for.'
    ),
  dataStreamType: z
    .enum(['logs', 'metrics', 'traces', 'synthetics', 'profiling'])
    .optional()
    .describe('Optional filter to return only integrations with data streams of a specific type.'),
});

export const listInstalledIntegrationsTool = (
  coreSetup: CoreSetup<FleetStartDeps, FleetStartContract>
): BuiltinToolDefinition<typeof listInstalledIntegrationsSchema> => ({
  id: FLEET_LIST_INSTALLED_INTEGRATIONS_TOOL_ID,
  type: ToolType.builtin,
  description: `List Fleet integrations installed in the current Kibana deployment.

Returns the name, version, status, title, description, and associated data streams for each installed integration.

Use this tool when the user asks about installed integrations, available data sources, or which integrations are configured in the system.`,
  schema: listInstalledIntegrationsSchema,
  handler: async ({ nameQuery, dataStreamType }, { request, logger }) => {
    try {
      const [, , fleetStart] = await coreSetup.getStartServices();
      const packageClient = fleetStart.packageService.asScoped(request);

      const response = await packageClient.getInstalledPackages({
        perPage: PER_PAGE,
        sortOrder: 'asc',
        ...(nameQuery ? { nameQuery } : {}),
        ...(dataStreamType ? { dataStreamType } : {}),
      });

      const integrations = response.items.map((item) => ({
        name: item.name,
        version: item.version,
        status: item.status,
        title: item.title,
        description: item.description,
        dataStreams: item.dataStreams.map((ds) => ({
          name: ds.name,
          title: ds.title,
        })),
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              integrations,
              total: response.total,
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`Error fetching installed integrations: ${error.message}`);
      return {
        results: [createErrorResult(`Failed to fetch installed integrations: ${error.message}`)],
      };
    }
  },
  tags: ['fleet', 'integration'],
});
