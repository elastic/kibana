/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runner } from '@kbn/onechat-server';
import type {
  InternalSetupServices,
  InternalStartServices,
  ServicesStartDeps,
  ServiceSetupDeps,
} from './types';
import type { McpConnectionManager } from './mcp/mcp_connection_manager';
import type { ComposioConnectionManager } from './composio/composio_connection_manager';
import type { UserMcpConnectionManager } from './user_mcp/connection_manager';
import { ToolsService } from './tools';
import { AgentsService } from './agents';
import { RunnerFactoryImpl } from './runner';
import { ConversationServiceImpl } from './conversation';
import { createChatService } from './chat';

interface ServiceInstances {
  tools: ToolsService;
  agents: AgentsService;
}

export class ServiceManager {
  private services?: ServiceInstances;
  private mcpConnectionManager?: McpConnectionManager;
  private composioConnectionManager?: ComposioConnectionManager;
  private userMcpConnectionManager?: UserMcpConnectionManager;
  public internalSetup?: InternalSetupServices;
  public internalStart?: InternalStartServices;

  setupServices({
    logger,
    workflowsManagement,
    mcpConnectionManager,
    composioConnectionManager,
    userMcpConnectionManager,
  }: ServiceSetupDeps): InternalSetupServices {
    this.mcpConnectionManager = mcpConnectionManager;
    this.composioConnectionManager = composioConnectionManager;
    this.userMcpConnectionManager = userMcpConnectionManager;
    this.services = {
      tools: new ToolsService(),
      agents: new AgentsService(),
    };

    this.internalSetup = {
      tools: this.services.tools.setup({
        logger,
        workflowsManagement,
        mcpConnectionManager,
        composioConnectionManager,
        userMcpConnectionManager,
      }),
      agents: this.services.agents.setup({ logger }),
    };

    return this.internalSetup;
  }

  startServices({
    logger,
    security,
    spaces,
    elasticsearch,
    inference,
    uiSettings,
    savedObjects,
    composioConnectionManager,
  }: ServicesStartDeps): InternalStartServices {
    if (!this.services) {
      throw new Error('#startServices called before #setupServices');
    }

    // Update composioConnectionManager from start phase
    if (composioConnectionManager) {
      this.composioConnectionManager = composioConnectionManager;
    }

    // eslint-disable-next-line prefer-const
    let runner: Runner | undefined;
    const getRunner = () => {
      if (!runner) {
        throw new Error('Trying to access runner before initialization');
      }
      return runner;
    };

    const tools = this.services.tools.start({
      getRunner,
      spaces,
      elasticsearch,
      uiSettings,
      savedObjects,
      composioConnectionManager: this.composioConnectionManager,
    });

    const agents = this.services.agents.start({
      spaces,
      security,
      elasticsearch,
      getRunner,
      toolsService: tools,
    });

    const runnerFactory = new RunnerFactoryImpl({
      logger: logger.get('runnerFactory'),
      security,
      elasticsearch,
      inference,
      toolsService: tools,
      agentsService: agents,
    });
    runner = runnerFactory.getRunner();

    const conversations = new ConversationServiceImpl({
      logger: logger.get('conversations'),
      security,
      elasticsearch,
      spaces,
    });

    const chat = createChatService({
      logger: logger.get('chat'),
      inference,
      conversationService: conversations,
      agentService: agents,
      uiSettings,
      savedObjects,
    });

    if (!this.mcpConnectionManager) {
      throw new Error('MCP Connection Manager not initialized');
    }

    this.internalStart = {
      tools,
      agents,
      conversations,
      runnerFactory,
      chat,
      mcp: this.mcpConnectionManager,
      composio: this.composioConnectionManager,
    };

    return this.internalStart;
  }
}
