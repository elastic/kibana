/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runner } from '@kbn/agent-builder-server';
import type { AgentBuilderConfig } from '../config';
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
import {
  createMeteringService,
  type MeteringService,
  createConsumptionService,
  type ConsumptionService,
} from './metering';
import { type PluginsService, createPluginsService } from './plugins';

interface ServiceInstances {
  tools: ToolsService;
  agents: AgentsService;
  attachments: AttachmentService;
  hooks: HooksService;
  skills: SkillService;
  plugins: PluginsService;
  metering: MeteringService;
  sml: SmlServiceInstance;
  consumption: ConsumptionService;
}

export class ServiceManager {
  private services?: ServiceInstances;
  public internalSetup?: InternalSetupServices;
  public internalStart?: InternalStartServices;
  private readonly config: AgentBuilderConfig;

  constructor(config: AgentBuilderConfig) {
    this.config = config;
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
      plugins: createPluginsService(),
      metering: createMeteringService({ cloud, usageApi, logger: logger.get('metering') }),
      sml: createSmlService(),
      consumption: createConsumptionService(),
    };

    const skillsSetup = this.services.skills.setup();

    this.internalSetup = {
      tools: this.services.tools.setup({ logger: logger.get('tools'), workflowsManagement }),
      agents: this.services.agents.setup({ logger: logger.get('agents') }),
      attachments: this.services.attachments.setup(),
      hooks: this.services.hooks.setup({ logger: logger.get('hooks') }),
      skills: skillsSetup,
      plugins: this.services.plugins.setup({ skillsSetup }),
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

    const attachments = this.services.attachments.start({
      spaces,
      savedObjects,
    });
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
      uiSettings,
      savedObjects,
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

    const plugins = this.services.plugins.start({
      logger: logger.get('plugins'),
      elasticsearch,
      spaces,
      config: this.config,
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
      pluginsServiceStart: plugins,
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

    const consumption = this.services.consumption.start({ elasticsearch, spaces });

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
      plugins,
      consumption,
    };

    return this.internalStart;
  }
}
