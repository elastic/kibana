/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { Composio } from '@composio/core';
import type { ComposioConfig, ComposioToolkitConfig } from '../../config';

interface UserMapping {
  kibanaUserId: string;
  composioUserId: string;
  createdAt: string;
}

interface ComposioTool {
  name: string;
  description: string;
  parameters: {
    properties: Record<string, any>;
    required?: string[];
    type: string;
  };
}

interface ComposioConnection {
  toolkitId: string;
  composioUserId: string;
  connectionId: string;
  status: string;
}

/**
 * Manages connections to Composio and user ID mappings
 */
export class ComposioConnectionManager {
  private readonly logger: Logger;
  private readonly config: ComposioConfig;
  private readonly esClient: ElasticsearchClient;
  private composioClient: Composio | null = null;
  private readonly userMappingIndex = '.kibana_onechat_composio_users';
  private initialized = false;

  constructor({
    logger,
    config,
    esClient,
  }: {
    logger: Logger;
    config: ComposioConfig;
    esClient: ElasticsearchClient;
  }) {
    this.logger = logger;
    this.config = config;
    this.esClient = esClient;
  }

  /**
   * Initialize Composio client and set up user mapping index
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info('Initializing Composio connection manager...');

      // Initialize Composio client
      this.composioClient = new Composio({ apiKey: this.config.apiKey });
      this.logger.info('Composio client initialized successfully');

      // Ensure user mapping index exists
      await this.ensureUserMappingIndex();

      // Log enabled toolkits
      const enabledToolkits = this.config.toolkits.filter((t) => t.enabled);
      this.logger.info(
        `Composio integration enabled with ${enabledToolkits.length} toolkits: ${enabledToolkits
          .map((t) => t.name)
          .join(', ')}`
      );

      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize Composio connection manager:', error);
      throw error;
    }
  }

  /**
   * Ensure the user mapping index exists
   */
  private async ensureUserMappingIndex(): Promise<void> {
    try {
      const exists = await this.esClient.indices.exists({ index: this.userMappingIndex });

      if (!exists) {
        await this.esClient.indices.create({
          index: this.userMappingIndex,
          body: {
            mappings: {
              properties: {
                kibanaUserId: { type: 'keyword' },
                composioUserId: { type: 'keyword' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        this.logger.info(`Created Composio user mapping index: ${this.userMappingIndex}`);
      }
    } catch (error) {
      this.logger.error('Failed to create user mapping index:', error);
      throw error;
    }
  }

  /**
   * Get or create a Composio user ID for a Kibana user
   */
  async getOrCreateComposioUserId(kibanaUserId: string): Promise<string> {
    this.ensureInitialized();

    try {
      // Try to find existing mapping
      const result = await this.esClient.search<UserMapping>({
        index: this.userMappingIndex,
        body: {
          query: {
            term: { kibanaUserId },
          },
        },
      });

      if (result.hits.hits.length > 0) {
        const mapping = result.hits.hits[0]._source!;
        this.logger.debug(
          `Found existing Composio user mapping: ${kibanaUserId} -> ${mapping.composioUserId}`
        );
        return mapping.composioUserId;
      }

      // Create new mapping - use Kibana user ID as Composio entity ID
      // Composio will handle this as a unique entity
      const composioUserId = `kibana_${kibanaUserId}`;

      await this.esClient.index({
        index: this.userMappingIndex,
        body: {
          kibanaUserId,
          composioUserId,
          createdAt: new Date().toISOString(),
        },
        refresh: 'wait_for',
      });

      this.logger.info(`Created new Composio user mapping: ${kibanaUserId} -> ${composioUserId}`);
      return composioUserId;
    } catch (error) {
      this.logger.error(`Failed to get/create Composio user ID for ${kibanaUserId}:`, error);
      throw error;
    }
  }

  /**
   * Get all tools for a specific toolkit
   */
  async getToolsForToolkit(toolkitConfig: ComposioToolkitConfig): Promise<ComposioTool[]> {
    this.ensureInitialized();

    try {
      this.logger.debug(
        `Fetching tools for toolkit "${toolkitConfig.name}" (toolkit: ${toolkitConfig.id})`
      );

      // Get all tools for this toolkit
      // Use uppercase (e.g., GMAIL, GOOGLECALENDAR)
      const toolkitName = toolkitConfig.id.toUpperCase();

      this.logger.debug(`Fetching tools for toolkit: ${toolkitName}`);
      const tools = await this.composioClient!.tools.getRawComposioTools({
        toolkits: [toolkitName],
      });

      this.logger.info(`Retrieved ${tools?.length || 0} tools for toolkit "${toolkitConfig.name}"`);

      const actionsList = tools || [];

      // Filter to specific tools if configured
      let filteredActions = actionsList;
      if (toolkitConfig.tools && toolkitConfig.tools.length > 0) {
        filteredActions = actionsList.filter((action: any) =>
          toolkitConfig.tools!.includes(action.slug)
        );
        this.logger.debug(
          `Filtered to ${filteredActions.length} specific tools for "${toolkitConfig.name}"`
        );
      }

      // Convert to our tool format
      return filteredActions.map((action: any) => ({
        name: action.slug, // Use slug as the unique identifier
        description: action.description || action.name || action.slug,
        parameters: action.inputParameters || {
          type: 'object',
          properties: {},
          required: [],
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';

      this.logger.error(`Failed to get tools for toolkit "${toolkitConfig.name}": ${errorMessage}`);

      if (errorStack) {
        this.logger.error(`Stack trace: ${errorStack}`);
      }

      // Log the full error object
      this.logger.error(
        'Full error object:',
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );

      throw error;
    }
  }

  /**
   * Get all tools from all enabled toolkits
   */
  async getAllTools(): Promise<Array<{ toolkit: ComposioToolkitConfig; tools: ComposioTool[] }>> {
    this.ensureInitialized();

    const enabledToolkits = this.config.toolkits.filter((t) => t.enabled);
    const results: Array<{ toolkit: ComposioToolkitConfig; tools: ComposioTool[] }> = [];

    for (const toolkit of enabledToolkits) {
      try {
        const tools = await this.getToolsForToolkit(toolkit);
        results.push({ toolkit, tools });
      } catch (error) {
        this.logger.error(`Failed to load tools for toolkit "${toolkit.name}":`, error);
        // Continue with other toolkits even if one fails
      }
    }

    return results;
  }

  /**
   * Create a connection for a user to a toolkit
   * Returns the connection details including redirect URL for OAuth
   */
  async createConnection(
    composioUserId: string,
    toolkitId: string,
    callbackUrl: string
  ): Promise<{ connectionId: string; redirectUrl: string }> {
    this.ensureInitialized();

    try {
      const toolkit = this.config.toolkits.find((t) => t.id === toolkitId);
      if (!toolkit) {
        throw new Error(`Toolkit "${toolkitId}" not found in configuration`);
      }

      this.logger.info(
        `Creating connection for user "${composioUserId}" to toolkit "${toolkit.name}" with integrationId: ${toolkit.authConfigId}, callbackUrl: ${callbackUrl}`
      );

      // Use connectedAccounts.link() with external user ID, integration ID, and callback URL
      const connectionRequest = await this.composioClient!.connectedAccounts.link(
        composioUserId,
        toolkit.authConfigId,
        {
          callbackUrl,
        }
      );

      this.logger.info(
        `Connection initiated for "${toolkit.name}": redirectUrl=${connectionRequest.redirectUrl}`
      );

      return {
        connectionId: connectionRequest.connectionId || '',
        redirectUrl: connectionRequest.redirectUrl || '',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));

      this.logger.error(
        `Failed to create connection for user "${composioUserId}" to toolkit "${toolkitId}": ${errorMessage}`
      );
      this.logger.error(`Error details: ${errorDetails}`);

      // Log the parameters we tried to send
      const toolkit = this.config.toolkits.find((t) => t.id === toolkitId);
      this.logger.error(
        `Attempted with: entityId=${composioUserId}, app=${toolkit?.id.toUpperCase()}, authConfig=${
          toolkit?.authConfigId
        }, callbackUrl=${callbackUrl}`
      );

      throw error;
    }
  }

  /**
   * Wait for a connection to be established
   * This should be called after the user completes OAuth
   */
  async waitForConnection(connectionId: string): Promise<any> {
    this.ensureInitialized();

    try {
      this.logger.info(`Waiting for connection "${connectionId}" to be established...`);

      // Use Composio's waitForConnection method
      const connection = await this.composioClient!.connectedAccounts.waitForConnection(
        connectionId
      );

      this.logger.info(
        `Connection "${connectionId}" established: app=${connection.appName}, status=${connection.status}`
      );

      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to wait for connection "${connectionId}": ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Check if a user has an active connection to a toolkit
   */
  async checkConnectionStatus(composioUserId: string, toolkitId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const toolkit = this.config.toolkits.find((t) => t.id === toolkitId);
      if (!toolkit) {
        this.logger.warn(`Toolkit "${toolkitId}" not found in configuration`);
        return false;
      }

      // Get connected accounts for this entity
      const result = await this.composioClient!.connectedAccounts.list({
        entityIds: [composioUserId],
      });

      const connections = result.items || [];

      this.logger.debug(`Found ${connections.length} connection(s) for entity "${composioUserId}"`);

      // Log connection details for debugging
      if (connections.length > 0) {
        connections.forEach((conn: any) => {
          this.logger.debug(`Connection: toolkit=${conn.toolkit?.slug}, status=${conn.status}`);
        });
      }

      // Check if there's an active connection for this app
      // Note: connections use toolkit.slug (lowercase) not appName
      const hasActiveConnection = connections.some(
        (conn: any) =>
          conn.toolkit?.slug?.toLowerCase() === toolkitId.toLowerCase() && conn.status === 'ACTIVE'
      );

      this.logger.debug(
        `Connection status for "${composioUserId}" / "${toolkitId}": ${hasActiveConnection}`
      );

      return hasActiveConnection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';

      this.logger.error(
        `Failed to check connection status for "${composioUserId}" / "${toolkitId}": ${errorMessage}`
      );

      if (errorStack) {
        this.logger.error(`Stack trace: ${errorStack}`);
      }

      // Log the full error object
      this.logger.error(
        'Full error object:',
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );

      return false;
    }
  }

  /**
   * Get connection details for a toolkit
   */
  async getConnectionForToolkit(
    composioUserId: string,
    toolkitId: string
  ): Promise<ComposioConnection | null> {
    this.ensureInitialized();

    try {
      const result = await this.composioClient!.connectedAccounts.list({
        entityIds: [composioUserId],
      });

      const connections = result.items || [];

      // Find active connection for this toolkit (use toolkit.slug, not appName)
      const connection = connections.find(
        (conn: any) =>
          conn.toolkit?.slug?.toLowerCase() === toolkitId.toLowerCase() && conn.status === 'ACTIVE'
      );

      if (!connection) {
        return null;
      }

      return {
        toolkitId,
        composioUserId,
        connectionId: connection.id,
        status: connection.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get connection for "${composioUserId}" / "${toolkitId}":`,
        error
      );
      return null;
    }
  }

  /**
   * Execute a tool action
   */
  async executeAction(params: {
    composioUserId: string;
    actionName: string;
    params: Record<string, unknown>;
    toolkitId: string;
  }): Promise<any> {
    this.ensureInitialized();

    try {
      this.logger.debug(
        `Executing action "${params.actionName}" for user "${params.composioUserId}" with params:`,
        JSON.stringify(params.params)
      );

      // Get the connection for this user and toolkit
      const connection = await this.getConnectionForToolkit(
        params.composioUserId,
        params.toolkitId
      );

      if (!connection) {
        throw new Error(
          `No active connection found for user "${params.composioUserId}" and toolkit "${params.toolkitId}"`
        );
      }

      // Ensure params is at least an empty object
      const toolParams = params.params || {};

      this.logger.debug(
        `Executing with connectedAccountId=${connection.connectionId}, userId=${params.composioUserId}`
      );

      const result = await this.composioClient!.tools.execute(params.actionName, {
        connectedAccountId: connection.connectionId,
        userId: params.composioUserId,
        arguments: toolParams,
      });

      this.logger.debug(`Action "${params.actionName}" executed successfully`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to execute action "${params.actionName}": ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get toolkit configuration by ID
   */
  getToolkitConfig(toolkitId: string): ComposioToolkitConfig | undefined {
    return this.config.toolkits.find((t) => t.id === toolkitId);
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.composioClient) {
      throw new Error('ComposioConnectionManager not initialized');
    }
  }

  /**
   * Cleanup resources
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Composio connection manager...');
    this.composioClient = null;
    this.initialized = false;
  }
}
