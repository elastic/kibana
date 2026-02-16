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
import { type AttachmentService, createAttachmentService } from './attachments';
import { HooksService } from './hooks';
import { type SkillService, createSkillService } from './skills';
import { createSmlService, type SmlServiceInstance } from './sml';
import { AuditLogService } from '../audit';
import { createAgentExecutionService, createTaskHandler } from './execution';
import { createMeteringService, type MeteringService } from './metering';

interface ServiceInstances {
  tools: ToolsService;
  agents: AgentsService;
  attachments: AttachmentService;
  hooks: HooksService;
  skills: SkillService;
  metering: MeteringService;
  sml: SmlServiceInstance;
}

export class ServiceManager {
  private services?: ServiceInstances;
  public internalSetup?: InternalSetupServices;
  public internalStart?: InternalStartServices;

  /**
   * Provides access to the SML service instance for task registration
   * and crawler scheduling.
   */
  getSmlServiceInstance(): SmlServiceInstance {
    if (!this.services?.sml) {
      throw new Error('SML service not available — call setupServices first');
    }
    return this.services.sml;
  }

  setupServices({
    logger,
    workflowsManagement,
    cloud,
    usageApi,
  }: ServiceSetupDeps): InternalSetupServices {
    this.services = {
      tools: new ToolsService(),
      agents: new AgentsService(),
      attachments: createAttachmentService(),
      hooks: new HooksService(),
      skills: createSkillService(),
      metering: createMeteringService({ cloud, usageApi, logger: logger.get('metering') }),
      sml: createSmlService(),
    };

    this.internalSetup = {
      tools: this.services.tools.setup({ logger: logger.get('tools'), workflowsManagement }),
      agents: this.services.agents.setup({ logger: logger.get('agents') }),
      attachments: this.services.attachments.setup(),
      hooks: this.services.hooks.setup({ logger: logger.get('hooks') }),
      skills: this.services.skills.setup(),
      metering: this.services.metering,
      sml: this.services.sml.setup({ logger: logger.get('sml') }),
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
    featureFlags,
    actions,
    taskManager,
    securityPlugin,
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
    const sml = this.services.sml.start({
      logger: logger.get('sml'),
      securityAuthz: securityPlugin?.authz,
    });

    const tools = this.services.tools.start({
      getRunner,
      spaces,
      elasticsearch,
      uiSettings,
      savedObjects,
      actions,
    });

    const skillsServiceStart = this.services.skills.start({
      elasticsearch,
      spaces,
      logger: logger.get('skills'),
      getToolRegistry: tools.getRegistry,
    });

    const agents = this.services.agents.start({
      spaces,
      security,
      elasticsearch,
      uiSettings,
      savedObjects,
      toolsService: tools,
    });

    const hooks = this.services.hooks.start();

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
      analyticsService,
      hooks,
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

    const taskHandler = createTaskHandler({
      logger: logger.get('task-handler'),
      elasticsearch,
      inference,
      conversationService: conversations,
      agentService: agents,
      runAgent: runner.runAgent,
      uiSettings,
      savedObjects,
      spaces,
      trackingService,
      analyticsService,
      meteringService: this.services.metering,
    });

    const execution = createAgentExecutionService({
      logger: logger.get('execution'),
      elasticsearch,
      taskManager,
      spaces,
      inference,
      conversationService: conversations,
      agentService: agents,
      runAgent: runner.runAgent,
      attachmentsService: attachments,
      uiSettings,
      savedObjects,
      trackingService,
      analyticsService,
      meteringService: this.services.metering,
    });

    this.internalStart = {
      tools,
      agents,
      attachments,
      skills: skillsServiceStart,
      conversations,
      runnerFactory,
      auditLogService,
      execution,
      taskHandler,
      hooks,
      spaces,
      featureFlags,
      uiSettings,
      savedObjects,
      sml,
    };

    return this.internalStart;
  }
}
