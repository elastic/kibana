/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import {
  CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID,
  CONTEXT_ENGINE_PLUGIN_ID,
} from '../common/constants';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerAiIndexRoutes } from './routes/ai_indices';
import { registerFeedbackLoopRoutes } from './routes/feedback_loop';
import { registerImprovementRoutes } from './routes/improvements';
import { registerSignalRoutes } from './routes/signals';
import { AiIndexService } from './ai_indices/service';
import { AiIndexRegistry } from './ai_indices/registry';
import { createFeedbackScheduleService } from './feedback/schedule';
import type { FeedbackScheduleService } from './feedback/schedule';
import { ImprovementsService } from './improvements/service';
import type { ImprovementsServiceApi } from './improvements/service';
import { SignalsService } from './signals/service';
import type { SignalsServiceApi } from './signals/service';
import { registerSignalGeneratorTaskDefinition, scheduleSignalGenerator } from './tasks';
import type { WorkflowProvider } from './workflows/provider';

export class ContextEnginePlugin
  implements
    Plugin<
      ContextEnginePluginSetup,
      ContextEnginePluginStart,
      ContextEngineSetupDependencies,
      ContextEngineStartDependencies
    >
{
  private logger: Logger;
  private aiIndexService?: AiIndexService;
  private signalsService?: SignalsService;
  private improvementsService?: ImprovementsService;
  private esClient?: ElasticsearchClient;
  private isFeedbackLoopEnabled: () => Promise<boolean> = async () => false;
  private workflowProvider?: WorkflowProvider;
  private feedbackScheduleService?: FeedbackScheduleService;
  /**
   * Resolves the plugin-scoped managed workflows client once per boot and reuses it: binding the
   * plugin id is a per-boot operation, not a per-request one. Assigned in `setup`.
   */
  private getManagedWorkflows: () => Promise<PluginScopedManagedWorkflowsApi | undefined> =
    async () => undefined;
  private readonly aiIndexRegistry = new AiIndexRegistry();

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>,
    setupDeps: ContextEngineSetupDependencies
  ): ContextEnginePluginSetup {
    registerFeatures({ features: setupDeps.features });

    coreSetup.uiSettings.registerGlobal({
      [CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID]: {
        name: i18n.translate('xpack.contextEngine.uiSettings.feedbackLoop.name', {
          defaultMessage: 'Context Engine feedback loop',
        }),
        description: i18n.translate('xpack.contextEngine.uiSettings.feedbackLoop.description', {
          defaultMessage:
            'Generates classified signals from Agent Builder traces to power the Context Engine feedback loop.',
        }),
        schema: schema.boolean(),
        value: false,
        experimental: true,
        requiresPageReload: false,
        readonly: false,
      },
    });

    registerSignalGeneratorTaskDefinition({
      taskManager: setupDeps.taskManager,
      getEsClient: () => {
        if (!this.esClient) {
          throw new Error('Elasticsearch client not available — plugin has not started');
        }
        return this.esClient;
      },
      getSignalsService: (): SignalsServiceApi => {
        if (!this.signalsService) {
          throw new Error('Signals service not available — plugin has not started');
        }
        return this.signalsService;
      },
      getFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
      logger: this.logger.get('signal_generator'),
    });

    const getSpaces = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.spaces;
    };

    // Claiming ownership has to happen in setup, before any install can reference the definition.
    setupDeps.workflowsExtensions?.registerManagedWorkflowOwner(CONTEXT_ENGINE_PLUGIN_ID);

    let managedWorkflows: Promise<PluginScopedManagedWorkflowsApi | undefined> | undefined;
    this.getManagedWorkflows = () => {
      managedWorkflows ??= coreSetup
        .getStartServices()
        .then(([, startDeps]) =>
          startDeps.workflowsExtensions?.initManagedWorkflowsClient(CONTEXT_ENGINE_PLUGIN_ID)
        );
      return managedWorkflows;
    };

    this.feedbackScheduleService = createFeedbackScheduleService({
      getManagedWorkflows: () => this.getManagedWorkflows(),
      getWorkflowProvider: () => this.workflowProvider,
      logger: this.logger.get('feedback_schedule'),
    });
    const feedbackScheduleService = this.feedbackScheduleService;

    const getAiIndexService = () => {
      if (!this.aiIndexService) {
        throw new Error('AI index service not available — plugin has not started');
      }
      return this.aiIndexService;
    };

    const getImprovementsService = (): ImprovementsServiceApi => {
      if (!this.improvementsService) {
        throw new Error('Improvements service not available — plugin has not started');
      }
      return this.improvementsService;
    };

    const router = coreSetup.http.createRouter();
    registerAiIndexRoutes({
      router,
      getAiIndexService,
      getFeedbackScheduleService: () => feedbackScheduleService,
      getActions: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.actions;
      },
      getSpaces,
    });

    // Read-only Signals routes (reads run as the current user, scoped to the active space).
    registerSignalRoutes({
      router,
      getSpaces,
      // Reads the current value at request time (assigned in start(), after this setup() runs).
      getFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
    });

    registerFeedbackLoopRoutes({
      router,
      getAiIndexService,
      getImprovementsService,
      getFeedbackScheduleService: () => feedbackScheduleService,
      getSpaces,
      getFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
    });

    registerImprovementRoutes({
      router,
      getAiIndexService,
      getImprovementsService,
      getWorkflowProvider: () => this.workflowProvider,
      getSpaces,
      getFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
      logger: this.logger.get('improvements'),
    });

    return {
      registerAiIndex: (id, properties) => this.aiIndexRegistry.register(id, properties),
      registerWorkflowProvider: (provider) => {
        if (this.workflowProvider) {
          throw new Error('A Context Engine workflow provider is already registered');
        }
        this.workflowProvider = provider;
      },
    };
  }

  start(coreStart: CoreStart, startDeps: ContextEngineStartDependencies): ContextEnginePluginStart {
    const aiIndexLogger = this.logger.get('ai_indices');

    this.esClient = coreStart.elasticsearch.client.asInternalUser;

    this.aiIndexService = new AiIndexService({
      esClient: this.esClient,
      logger: aiIndexLogger,
    });

    this.signalsService = new SignalsService({
      esClient: this.esClient,
      logger: this.logger.get('signals'),
    });
    const signalsService = this.signalsService;

    this.improvementsService = new ImprovementsService({
      esClient: this.esClient,
      logger: this.logger.get('improvements'),
    });
    const improvementsService = this.improvementsService;

    const aiIndexService = this.aiIndexService;
    const registry = this.aiIndexRegistry;

    const soClient = coreStart.savedObjects.createInternalRepository();
    const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);
    const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(soClient);

    this.isFeedbackLoopEnabled = async () =>
      (await globalUiSettings.get<boolean>(CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID)) ??
      false;

    uiSettings
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)
      .then((isEnabled) =>
        registry.startupRegister({
          aiIndexService,
          isEnabled: isEnabled ?? false,
          logger: aiIndexLogger,
        })
      )
      .catch((err) => {
        aiIndexLogger.warn(
          `AI index startup registration failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      });

    // The improvement loop has no static workflows to install: instances are created per AI index,
    // on demand. Signalling readiness right away is what lets the platform auto-upgrade those
    // instances when the definition version changes.
    this.getManagedWorkflows()
      .then((managedWorkflows) => managedWorkflows?.ready())
      .catch((err) => {
        this.logger.warn(
          `Failed to signal managed workflow readiness: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      });

    scheduleSignalGenerator({ taskManager: startDeps.taskManager }).catch((err) => {
      this.logger.warn(
        `Failed to schedule signal generator: ${err instanceof Error ? err.message : String(err)}`
      );
    });

    return {
      getAiIndexService: () => {
        if (!this.aiIndexService) {
          throw new Error('AI index service not available — plugin has not started');
        }
        return this.aiIndexService;
      },
      getSignalsService: () => signalsService,
      getImprovementsService: () => improvementsService,
      getFeedbackScheduleService: () => {
        if (!this.feedbackScheduleService) {
          throw new Error('Feedback schedule service not available — plugin has not set up');
        }
        return this.feedbackScheduleService;
      },
    };
  }

  stop() {}
}
