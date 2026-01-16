/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, StartServicesAccessor } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import defaultLLMConnectors from './default_llm_connectors.json';

interface StartDeps {
  actions: ActionsPluginStart;
}

/**
 *
 * This function is called when EIS (Elastic Inference Service) is being enabled. It checks
 * if the user has the `actions.save` Kibana privilege, and if so, compares the existing
 * connectors against the default LLM connectors defined in `default_llm_connectors.json`.
 * Any missing connectors are created automatically.
 *
 */
export async function updateDefaultLLMActions(
  getStartServices: StartServicesAccessor<StartDeps>,
  request: KibanaRequest,
  logger: Logger
): Promise<void> {
  const [coreStart, pluginsStart] = await getStartServices();
  const capabilities = await coreStart.capabilities.resolveCapabilities(request, {
    capabilityPath: 'actions.*',
  });
  const hasActionsSavePrivilege = capabilities.actions?.save === true;

  if (!hasActionsSavePrivilege) {
    logger.warn('Not enough privileges to update default llm actions..');
    return;
  }

  logger.info('Will update default llm actions..');

  const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);

  // Get all existing connectors
  const existingConnectors = await actionsClient.getAll();
  const existingConnectorIds = new Set(existingConnectors.map((c) => c.id));

  // Create any missing default LLM connectors
  for (const connector of defaultLLMConnectors) {
    if (existingConnectorIds.has(connector.id)) {
      logger.debug(`Default LLM connector "${connector.name}" already exists, skipping`);
      continue;
    }

    try {
      await actionsClient.create({
        action: {
          actionTypeId: connector.actionTypeId,
          name: connector.name,
          config: connector.config,
          secrets: {},
        },
        options: {
          id: connector.id,
        },
      });
      logger.info(`Created default LLM connector: ${connector.name}`);
    } catch (error) {
      logger.warn(`Failed to create default LLM connector "${connector.name}": ${error.message}`);
    }
  }
}
