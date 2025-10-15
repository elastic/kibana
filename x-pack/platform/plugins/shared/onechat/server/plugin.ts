/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { OnechatConfig } from './config';
import { validateMcpServerConfigs } from './config_validation';
import { McpConnectionManager } from './services/mcp/mcp_connection_manager';
import { ComposioConnectionManager } from './services/composio/composio_connection_manager';
import { ServiceManager } from './services';
import type {
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerRoutes } from './routes';
import { registerUISettings } from './ui_settings';
import type { OnechatHandlerContext } from './request_handler_context';
import { registerOnechatHandlerContext } from './request_handler_context';

export class OnechatPlugin
  implements
    Plugin<
      OnechatPluginSetup,
      OnechatPluginStart,
      OnechatSetupDependencies,
      OnechatStartDependencies
    >
{
  private logger: Logger;
  private config: OnechatConfig;
  private serviceManager = new ServiceManager();
  private mcpConnectionManager?: McpConnectionManager;
  private composioConnectionManager?: ComposioConnectionManager;

  constructor(context: PluginInitializerContext<OnechatConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    setupDeps: OnechatSetupDependencies
  ): OnechatPluginSetup {
    // Validate MCP server configuration
    const mcpServers = this.config.mcp.servers;
    const configErrors = validateMcpServerConfigs(mcpServers);
    if (configErrors.length > 0) {
      this.logger.error('MCP server configuration errors:');
      configErrors.forEach((error) => this.logger.error(`  - ${error}`));
      throw new Error(`Invalid MCP server configuration. See logs for details.`);
    }

    // Initialize MCP connection manager
    this.mcpConnectionManager = new McpConnectionManager({
      logger: this.logger.get('mcp'),
      config: mcpServers,
    });

    // Initialize connection manager asynchronously (non-blocking)
    this.mcpConnectionManager.initialize().catch((error) => {
      this.logger.error(`Failed to initialize MCP connections: ${error}`);
    });

    // Note: Composio initialization happens in start() phase when Elasticsearch client is available

    const serviceSetups = this.serviceManager.setupServices({
      logger: this.logger.get('services'),
      workflowsManagement: setupDeps.workflowsManagement,
      mcpConnectionManager: this.mcpConnectionManager,
      composioConnectionManager: undefined, // Will be initialized in start()
    });

    registerFeatures({ features: setupDeps.features });

    registerUISettings({ uiSettings: coreSetup.uiSettings });

    registerOnechatHandlerContext({ coreSetup });

    const router = coreSetup.http.createRouter<OnechatHandlerContext>();
    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      pluginsSetup: setupDeps,
      getInternalServices: () => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('getInternalServices called before service init');
        }
        return services;
      },
    });

    return {
      tools: {
        register: serviceSetups.tools.register.bind(serviceSetups.tools),
      },
      agents: {
        register: serviceSetups.agents.register.bind(serviceSetups.agents),
      },
    };
  }

  start(
    { elasticsearch, security, uiSettings, savedObjects }: CoreStart,
    { inference, spaces }: OnechatStartDependencies
  ): OnechatPluginStart {
    // Initialize Composio connection manager if configured (needs Elasticsearch client)
    if (this.config.composio) {
      this.composioConnectionManager = new ComposioConnectionManager({
        logger: this.logger.get('composio'),
        config: this.config.composio,
        esClient: elasticsearch.client.asInternalUser,
      });

      // Initialize Composio manager asynchronously (non-blocking)
      this.composioConnectionManager.initialize().catch((error) => {
        this.logger.error(`Failed to initialize Composio integration: ${error}`);
      });
    }

    const startServices = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security,
      elasticsearch,
      inference,
      spaces,
      uiSettings,
      savedObjects,
      composioConnectionManager: this.composioConnectionManager,
    });

    const { tools, runnerFactory } = startServices;
    const runner = runnerFactory.getRunner();

    return {
      tools: {
        getRegistry: ({ request }) => tools.getRegistry({ request }),
        execute: runner.runTool.bind(runner),
      },
    };
  }

  async stop() {
    // Shutdown MCP connections
    if (this.mcpConnectionManager) {
      await this.mcpConnectionManager.shutdown();
    }

    // Shutdown Composio connections
    if (this.composioConnectionManager) {
      await this.composioConnectionManager.stop();
    }
  }
}
