/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

export interface StackConnectorCreatorService {
  instantiateStackConnector(
    connectorName: string,
    connectorType: string,
    secrets: string,
    request: KibanaRequest,
    feature?: string
  ): Promise<string>;
  disconnectStackConnector(connectorId: string, request: KibanaRequest): Promise<void>;
}

export class StackConnectorCreator implements StackConnectorCreatorService {
  constructor(private readonly logger: Logger, private actions?: ActionsPluginStart) {}

  public setActions(actions: ActionsPluginStart) {
    this.actions = actions;
  }

  /**
   * Creates a Kibana stack connector for Notion
   * @param connectorName - The name of the connector
   * @param connectorType - The type of connector (e.g., 'notion')
   * @param secrets - The OAuth token for the connector
   * @param request - The Kibana request object
   * @param feature - Optional feature flag
   * @returns The ID of the created stack connector
   */
  async instantiateStackConnector(
    connectorName: string,
    connectorType: string,
    secrets: string,
    request: KibanaRequest,
    feature?: string
  ): Promise<string> {
    if (!this.actions) {
      throw new Error('Actions plugin not available');
    }

    this.logger.info(
      `Creating Kibana stack connector for ${connectorType} with name ${connectorName}`
    );

    try {
      const actionsClient = await this.actions.getActionsClientWithRequest(request);

      // Map connector type to stack connector type ID
      const stackConnectorTypeId = this.getStackConnectorTypeId(connectorType);

      // Create the connector
      const connector = await actionsClient.create({
        action: {
          name: connectorName,
          actionTypeId: stackConnectorTypeId,
          config: {},
          secrets: {
            token: secrets,
          },
        },
      });

      this.logger.info(
        `Successfully created Kibana stack connector ${connector.id} for ${connectorType}`
      );

      return connector.id;
    } catch (error) {
      this.logger.error(
        `Failed to create Kibana stack connector for ${connectorType}: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Maps workplace connector type to stack connector type ID
   */
  private getStackConnectorTypeId(connectorType: string): string {
    const mapping: Record<string, string> = {
      notion: '.notion',
      // Add other connector type mappings as needed
    };

    const stackConnectorTypeId = mapping[connectorType];
    if (!stackConnectorTypeId) {
      throw new Error(`Unsupported connector type for stack connector: ${connectorType}`);
    }

    return stackConnectorTypeId;
  }

  async disconnectStackConnector(connectorId: string, request: KibanaRequest): Promise<void> {
    if (!this.actions) {
      throw new Error('Actions plugin not available');
    }
    const actionsClient = await this.actions.getActionsClientWithRequest(request);
    await actionsClient.delete({ id: connectorId });
    this.logger.info(`Successfully deleted Kibana stack connector ${connectorId}`);
  }
}
