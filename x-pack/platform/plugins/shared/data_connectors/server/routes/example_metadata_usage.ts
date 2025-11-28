/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EXAMPLE: How to access connector metadata from the actions registry
 *
 * This demonstrates that we don't need a separate registry - the actions plugin
 * preserves our custom metadata and we can access it whenever needed.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  getConnectorMetadata,
  generateWorkflowsForConnector,
  hasOAuthSupport,
  shouldGenerateTools,
} from '../utils/get_connector_metadata';

export function registerExampleRoutes(router: IRouter, logger: Logger) {
  // Example 1: Get metadata for a connector type
  router.get(
    {
      path: '/api/data_connectors/metadata/{connectorTypeId}',
      validate: false,
    },
    async (context, request, response) => {
      const { connectorTypeId } = request.params as { connectorTypeId: string };
      const actions = (await context.actions).getActionsClient();

      // Access the metadata stored in actions registry
      const metadata = getConnectorMetadata(
        await (await context.actions).listTypes(),
        connectorTypeId
      );

      if (!metadata) {
        return response.notFound({
          body: { message: `No metadata found for ${connectorTypeId}` },
        });
      }

      return response.ok({
        body: {
          connectorTypeId,
          hasOAuth: !!metadata.oauth,
          workflows: Object.keys(metadata.workflowTemplates || {}),
          toolGenerationEnabled: metadata.toolGeneration?.enabled,
          features: metadata.features,
        },
      });
    }
  );

  // Example 2: Generate workflows for a connector instance
  router.post(
    {
      path: '/api/data_connectors/{connectorId}/generate_workflows',
      validate: false,
    },
    async (context, request, response) => {
      const { connectorId } = request.params as { connectorId: string };

      try {
        // Get the connector instance to find its type
        const actionsClient = (await context.actions).getActionsClient();
        const connector = await actionsClient.get({ id: connectorId });

        // Generate workflows using the metadata
        const workflows = await generateWorkflowsForConnector(
          await context.actions,
          connector.actionTypeId,
          connectorId
        );

        logger.info(
          `Generated ${workflows.length} workflows for connector ${connectorId} (type: ${connector.actionTypeId})`
        );

        return response.ok({
          body: {
            connectorId,
            connectorTypeId: connector.actionTypeId,
            workflows: workflows.map((w) => ({
              id: w.workflowId,
              yaml: w.yaml,
            })),
          },
        });
      } catch (error) {
        logger.error(`Failed to generate workflows: ${error.message}`);
        return response.badRequest({ body: { message: error.message } });
      }
    }
  );

  // Example 3: Check if connector supports OAuth
  router.get(
    {
      path: '/api/data_connectors/{connectorTypeId}/supports_oauth',
      validate: false,
    },
    async (context, request, response) => {
      const { connectorTypeId } = request.params as { connectorTypeId: string };

      const supportsOAuth = hasOAuthSupport(await context.actions, connectorTypeId);

      return response.ok({
        body: {
          connectorTypeId,
          supportsOAuth,
        },
      });
    }
  );
}