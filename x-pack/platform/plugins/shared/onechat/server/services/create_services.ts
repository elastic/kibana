/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runner } from '@kbn/onechat-server';
import { AgentsService } from './agents';
import { createChatService } from './chat';
import { ConversationServiceImpl } from './conversation';
import { RunnerFactoryImpl } from './runner';
import { ToolsService } from './tools';
import type {
  InternalSetupServices,
  InternalStartServices,
  ServiceSetupDeps,
  ServicesStartDeps,
} from './types';

interface ServiceInstances {
  tools: ToolsService;
  agents: AgentsService;
}

export class ServiceManager {
  private services?: ServiceInstances;
  public internalSetup?: InternalSetupServices;
  public internalStart?: InternalStartServices;

  setupServices({ logger, workflowsManagement }: ServiceSetupDeps): InternalSetupServices {
    this.services = {
      tools: new ToolsService(),
      agents: new AgentsService(),
    };

    this.internalSetup = {
      tools: this.services.tools.setup({ logger, workflowsManagement }),
      agents: this.services.agents.setup({ logger }),
    };

    return this.internalSetup;
  }

  startServices({
    logger,
    security,
    elasticsearch,
    inference,
    uiSettings,
    savedObjects,
  }: ServicesStartDeps): InternalStartServices {
    if (!this.services) {
      throw new Error('#startServices called before #setupServices');
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
      elasticsearch,
    });

    const agents = this.services.agents.start({
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
    });

    const chat = createChatService({
      logger: logger.get('chat'),
      inference,
      conversationService: conversations,
      agentService: agents,
      uiSettings,
      savedObjects,
    });

    this.internalStart = {
      tools,
      agents,
      conversations,
      runnerFactory,
      chat,
    };

    return this.internalStart;
  }
}
