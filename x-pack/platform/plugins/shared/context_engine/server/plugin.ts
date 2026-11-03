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
  KibanaRequest,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID } from '../common/constants';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
  DeleteWorkflowsApi,
  GetAiIndexDataReadServiceParams,
} from './types';
import type { KiVerifierWorkflowRunner } from './ki_verification';
import { registerFeatures } from './features';
import { registerAiIndexRoutes } from './routes/ai_indices';
import { registerSignalRoutes } from './routes/signals';
import type {
  FeedbackAnalysisScheduleService,
  WorkflowEnablementApi,
} from './feedback_analysis/schedule';
import { createFeedbackAnalysisScheduleService } from './feedback_analysis/schedule';
import type { AiIndexDataReadService } from './ai_indices/data_read_service';
import { createAiIndexDataReadServiceFactory } from './ai_indices/create_ai_index_data_read_service';
import { createAiIndexService } from './ai_indices/create_ai_index_service';
import type { AiIndexService } from './ai_indices/service';
import { AiIndexRegistry } from './ai_indices/registry';
import { createImprovementsServiceFactory } from './improvements/create_improvements_service';
import type { ImprovementsService } from './improvements/service';
import { installImprovementsIndexTemplate } from './improvements/storage';
import { SignalsService } from './signals/service';
import type { SignalsServiceApi } from './signals/service';
import { registerSignalGeneratorTaskDefinition, scheduleSignalGenerator } from './signal_generator';
import { contextEngineBridge } from './tasks/bridge';
import { registerContextEngineSteps } from './step_types/register_steps';
import { ContextEngineAnalyticsService, registerContextEngineUsageCollector } from './telemetry';
import { createIsFeedbackLoopEnabled } from './utils/is_feedback_loop_enabled';

/** Must match the `pluginId` on the managed workflow definition. */
const CONTEXT_ENGINE_WORKFLOW_OWNER = 'contextEngine';

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
  private createImprovementsService?: (
    esClient: ElasticsearchClient,
    spaceId: string
  ) => ImprovementsService;
  private createAiIndexDataReadService?: (
    params: GetAiIndexDataReadServiceParams
  ) => AiIndexDataReadService;
  private esClient?: ElasticsearchClient;
  private scheduleService?: FeedbackAnalysisScheduleService;
  /** Captured at setup because the schedule service, built at start, enables workflows with it. */
  private workflowsManagement?: WorkflowEnablementApi;
  private isFeedbackLoopEnabled: () => Promise<boolean> = async () => false;
  private readonly aiIndexRegistry = new AiIndexRegistry();
  private analyticsService?: ContextEngineAnalyticsService;
  private workflowsManagementApiPromise: Promise<
    (DeleteWorkflowsApi & KiVerifierWorkflowRunner) | undefined
  > = Promise.resolve(undefined);

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>,
    setupDeps: ContextEngineSetupDependencies
  ): ContextEnginePluginSetup {
    registerFeatures({ features: setupDeps.features });
    this.setupWorkflowsManagement(coreSetup);

    this.workflowsManagement = setupDeps.workflowsManagement?.management;

    this.analyticsService = new ContextEngineAnalyticsService(
      coreSetup.analytics,
      this.logger.get('telemetry')
    );
    this.analyticsService.registerContextEngineEventTypes();
    const analyticsService = this.analyticsService;

    registerContextEngineUsageCollector({
      usageCollection: setupDeps.usageCollection,
      getEsClient: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        return coreStart.elasticsearch.client.asInternalUser;
      },
      getManagedDest: (id) => this.aiIndexRegistry.get(id)?.dest,
      logger: this.logger.get('telemetry'),
    });

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
      [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: {
        name: i18n.translate('xpack.contextEngine.uiSettings.memory.name', {
          defaultMessage: 'Context Engine memory',
        }),
        description: i18n.translate('xpack.contextEngine.uiSettings.memory.description', {
          defaultMessage: 'Enables memory capabilities for Context Engine AI indices.',
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

    setupDeps.workflowsExtensions.registerManagedWorkflowOwner(CONTEXT_ENGINE_WORKFLOW_OWNER);

    const getAiIndexService = () => {
      if (!this.aiIndexService) {
        throw new Error('AI index service not available — plugin has not started');
      }
      return this.aiIndexService;
    };

    const getImprovementsService = (esClient: ElasticsearchClient, spaceId: string) => {
      if (!this.createImprovementsService) {
        throw new Error('Improvements service not available — plugin has not started');
      }
      return this.createImprovementsService(esClient, spaceId);
    };

    const getScheduleService = () => {
      if (!this.scheduleService) {
        throw new Error('Schedule service not available — plugin has not started');
      }
      return this.scheduleService;
    };

    const isMemoryEnabled = async (request: KibanaRequest) => {
      const [coreStart] = await coreSetup.getStartServices();
      const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
      const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);
      return (
        (await globalUiSettings.get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID)) ?? false
      );
    };

    const router = coreSetup.http.createRouter();
    registerAiIndexRoutes({
      router,
      logger: this.logger.get('routes'),
      getAiIndexService,
      getImprovementsService,
      getScheduleService,
      isMemoryEnabled,
      getAiIndexDataReadService: (params) => {
        if (!this.createAiIndexDataReadService) {
          throw new Error('AI index read service not available — plugin has not started');
        }
        return this.createAiIndexDataReadService(params);
      },
      getActions: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.actions;
      },
      // Resolved at runtime because a static dependency on agentBuilder would be a cycle:
      // agentBuilder -> agentBuilderSml -> contextEngine.
      getAgentBuilder: async () => {
        const { agentBuilder } = await coreSetup.plugins.onStart<{
          agentBuilder: AgentBuilderPluginStart;
        }>('agentBuilder');
        return agentBuilder.found ? agentBuilder.contract : undefined;
      },
      getWorkflowsManagementApi: () => this.workflowsManagementApiPromise,
      getSpaces: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.spaces;
      },
      analyticsService,
    });

    registerContextEngineSteps({
      workflowsExtensions: setupDeps.workflowsExtensions,
      getStartServices: coreSetup.getStartServices,
      analyticsService,
      getAiIndexService,
      getImprovementsService,
      isFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
      getWorkflowsManagement: () => this.workflowsManagementApiPromise,
      logger: this.logger.get('context_steps'),
      feedbackAnalysisLogger: this.logger.get('feedback_analysis'),
    });

    // Read-only Signals routes (reads run as the current user, scoped to the active space).
    registerSignalRoutes({
      router,
      getSpaces: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.spaces;
      },
      // Reads the current value at request time (assigned in start(), after this setup() runs).
      getFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
    });

    return {
      registerAiIndex: (id, properties) => this.aiIndexRegistry.register(id, properties),
    };
  }

  private setupWorkflowsManagement(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>
  ): void {
    try {
      this.workflowsManagementApiPromise = coreSetup.plugins
        .onSetup<{
          workflowsManagement: { management: DeleteWorkflowsApi & KiVerifierWorkflowRunner };
        }>('workflowsManagement')
        .then(({ workflowsManagement }) =>
          workflowsManagement.found ? workflowsManagement.contract.management : undefined
        )
        .catch(() => undefined);
    } catch {
      this.workflowsManagementApiPromise = Promise.resolve(undefined);
    }
  }

  start(coreStart: CoreStart, startDeps: ContextEngineStartDependencies): ContextEnginePluginStart {
    this.aiIndexRegistry.freeze();
    const aiIndexLogger = this.logger.get('ai_indices');

    this.esClient = coreStart.elasticsearch.client.asInternalUser;

    this.aiIndexService = createAiIndexService({
      esClient: this.esClient,
      logger: aiIndexLogger,
      registry: this.aiIndexRegistry,
      coreStart,
    });
    const aiIndexService = this.aiIndexService;

    this.signalsService = new SignalsService({
      esClient: this.esClient,
      logger: this.logger.get('signals'),
    });
    const signalsService = this.signalsService;

    const improvementsLogger = this.logger.get('improvements');
    this.createImprovementsService = createImprovementsServiceFactory(improvementsLogger);
    const createImprovementsService = this.createImprovementsService;

    this.createAiIndexDataReadService = createAiIndexDataReadServiceFactory({
      coreStart,
      spaces: startDeps.spaces,
      aiIndexService,
      logger: this.logger,
    });
    const createAiIndexDataReadService = this.createAiIndexDataReadService;

    // Installed as Kibana, with the cluster privilege it already holds. The index is left for the
    // first user write to create from it, so the store needs no grant on the internal user.
    installImprovementsIndexTemplate({
      esClient: this.esClient,
      logger: improvementsLogger,
    }).catch((err) => {
      improvementsLogger.warn(
        `Failed to install the improvements index template: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    });

    this.scheduleService = createFeedbackAnalysisScheduleService({
      logger: this.logger,
      getManagedWorkflowsClient: () =>
        startDeps.workflowsExtensions.initManagedWorkflowsClient(CONTEXT_ENGINE_WORKFLOW_OWNER),
      ...(this.workflowsManagement ? { workflowsManagement: this.workflowsManagement } : {}),
    });

    this.isFeedbackLoopEnabled = createIsFeedbackLoopEnabled(coreStart);

    scheduleSignalGenerator({ taskManager: startDeps.taskManager }).catch((err) => {
      this.logger.warn(
        `Failed to schedule signal generator: ${err instanceof Error ? err.message : String(err)}`
      );
    });

    const startContract: ContextEnginePluginStart = {
      getAiIndexService: () => {
        if (!this.aiIndexService) {
          throw new Error('AI index service not available — plugin has not started');
        }
        return this.aiIndexService;
      },
      getAiIndexDataReadService: (params) => createAiIndexDataReadService(params),
      getSignalsService: () => signalsService,
      getImprovementsService: (esClient, spaceId) => createImprovementsService(esClient, spaceId),
    };
    contextEngineBridge.setStart(startContract);
    return startContract;
  }

  stop() {}
}
