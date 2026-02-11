/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runner } from '@kbn/agent-builder-server';
import type {
  InternalSetupServices,
  InternalStartServices,
  ServicesStartDeps,
  ServiceSetupDeps,
} from './types';
import { ToolsService } from './tools';
import { AgentsService } from './agents';
import { RunnerFactoryImpl } from './runner';
import { ConversationServiceImpl } from './conversation';
import { createChatService } from './chat';
import { type AttachmentService, createAttachmentService } from './attachments';
import { type SkillService, createSkillService } from './skills';
import { AuditLogService } from '../audit';

interface ServiceInstances {
  tools: ToolsService;
  agents: AgentsService;
  attachments: AttachmentService;
  skills: SkillService;
}

export class ServiceManager {
  private services?: ServiceInstances;
  public internalSetup?: InternalSetupServices;
  public internalStart?: InternalStartServices;

  setupServices({ logger, workflowsManagement }: ServiceSetupDeps): InternalSetupServices {
    this.services = {
      tools: new ToolsService(),
      agents: new AgentsService(),
      attachments: createAttachmentService(),
      skills: createSkillService(),
    };

    this.internalSetup = {
      tools: this.services.tools.setup({ logger, workflowsManagement }),
      agents: this.services.agents.setup({ logger }),
      attachments: this.services.attachments.setup(),
      skills: this.services.skills.setup(),
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
    actions,
    trackingService,
    analyticsService,
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

    const attachments = this.services.attachments.start();
    const skillsServiceStart = this.services.skills.start();

    const tools = this.services.tools.start({
      getRunner,
      spaces,
      elasticsearch,
      uiSettings,
      savedObjects,
      actions,
    });

    const agents = this.services.agents.start({
      spaces,
      security,
      elasticsearch,
      uiSettings,
      savedObjects,
      getRunner,
      toolsService: tools,
    });

    const runnerFactory = new RunnerFactoryImpl({
      logger: logger.get('runnerFactory'),
      security,
      elasticsearch,
      uiSettings,
      savedObjects,
      inference,
      spaces,
      actions,
      toolsService: tools,
      agentsService: agents,
      attachmentsService: attachments,
      skillServiceStart: skillsServiceStart,
      trackingService,
    });
    runner = runnerFactory.getRunner();

    const conversations = new ConversationServiceImpl({
      logger: logger.get('conversations'),
      security,
      elasticsearch,
      spaces,
    });

    const auditLogService = new AuditLogService({
      security,
      logger: logger.get('audit'),
    });

    const chat = createChatService({
      logger: logger.get('chat'),
      inference,
      conversationService: conversations,
      agentService: agents,
      uiSettings,
      savedObjects,
      trackingService,
      analyticsService,
    });

    this.internalStart = {
      tools,
      agents,
      attachments,
      skills: skillsServiceStart,
      conversations,
      runnerFactory,
      auditLogService,
      chat,
    };

    return this.internalStart;
  }
}
