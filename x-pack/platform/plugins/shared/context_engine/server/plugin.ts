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
import type { Logger } from '@kbn/logging';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID } from '../common/constants';
import { apiPrivileges } from '../common/features';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
  DeleteWorkflowsApi,
} from './types';
import { registerFeatures } from './features';
import { registerAiIndexRoutes } from './routes/ai_indices';
import { registerSignalRoutes } from './routes/signals';
import type {
  FeedbackAnalysisScheduleService,
  WorkflowEnablementApi,
} from './feedback_analysis/schedule';
import { createFeedbackAnalysisScheduleService } from './feedback_analysis/schedule';
import { AiIndexService } from './ai_indices/service';
import { AiIndexRegistry } from './ai_indices/registry';
import { ImprovementsService } from './improvements/service';
import { installImprovementsIndexTemplate } from './improvements/storage';
import { SignalsService } from './signals/service';
import type { SignalsServiceApi } from './signals/service';
import { registerSignalGeneratorTaskDefinition, scheduleSignalGenerator } from './tasks';
import { createVerifyKiStepDefinition } from './step_types/verify_ki_step';
import { registerStepDefinitions } from './step_types';
import { ContextEngineAnalyticsService } from './telemetry';
import { isContextEngineEnabledInSpace } from './utils/is_context_engine_enabled_in_space';

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
  private esClient?: ElasticsearchClient;
  private scheduleService?: FeedbackAnalysisScheduleService;
  /** Captured at setup because the schedule service, built at start, enables workflows with it. */
  private workflowsManagement?: WorkflowEnablementApi;
  private isFeedbackLoopEnabled: () => Promise<boolean> = async () => false;
  private readonly aiIndexRegistry = new AiIndexRegistry();
  private analyticsService?: ContextEngineAnalyticsService;
  private workflowsManagementApiPromise: Promise<DeleteWorkflowsApi | undefined> =
    Promise.resolve(undefined);

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

    setupDeps.workflowsExtensions.registerStepDefinition(
      createVerifyKiStepDefinition(coreSetup, this.logger.get('context_steps'), analyticsService)
    );

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

    const router = coreSetup.http.createRouter();
    registerAiIndexRoutes({
      router,
      logger: this.logger.get('routes'),
      getAiIndexService,
      getImprovementsService,
      getScheduleService,
      getActions: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.actions;
      },
      getWorkflowsManagementApi: () => this.workflowsManagementApiPromise,
      getSpaces: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.spaces;
      },
    });

    const isContextEngineEnabled = async (spaceId: string) => {
      const [coreStart] = await coreSetup.getStartServices();
      return isContextEngineEnabledInSpace({
        savedObjects: coreStart.savedObjects,
        uiSettings: coreStart.uiSettings,
        spaceId,
      });
    };

    const checkWritePrivilege = async (request: KibanaRequest, spaceId: string) => {
      const [, startDeps] = await coreSetup.getStartServices();
      const { security } = startDeps;
      if (!security) {
        return true;
      }
      const { hasAllRequested } = await security.authz
        .checkPrivilegesWithRequest(request)
        .atSpace(spaceId, {
          kibana: [security.authz.actions.api.get(apiPrivileges.writeContextEngine)],
        });
      return hasAllRequested;
    };

    registerStepDefinitions({
      workflowsExtensions: setupDeps.workflowsExtensions,
      analyticsService,
      logger: this.logger.get('context_steps'),
      getAiIndexService,
      isContextEngineEnabled,
      checkWritePrivilege,
      feedbackAnalysis: {
        getAiIndexService,
        getImprovementsService,
        getAuditLogger: async (request) => {
          const [coreStart] = await coreSetup.getStartServices();
          return coreStart.security.audit.asScoped(request);
        },
        isContextEngineEnabled,
        isFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
        checkWritePrivilege,
        logger: this.logger.get('feedback_analysis'),
      },
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
        .onSetup<{ workflowsManagement: { management: DeleteWorkflowsApi } }>('workflowsManagement')
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

    const ensureAiIndex = async (id: string, spaceId: string): Promise<boolean> => {
      const enabled = await isContextEngineEnabledInSpace({
        savedObjects: coreStart.savedObjects,
        uiSettings: coreStart.uiSettings,
        spaceId,
      });
      if (!enabled) {
        return false;
      }
      if (!this.aiIndexService) {
        throw new Error('AI index service not available — plugin has not started');
      }
      await this.aiIndexRegistry.ensure({
        id,
        spaceId,
        aiIndexService: this.aiIndexService,
        logger: aiIndexLogger,
      });
      return true;
    };

    this.aiIndexService = new AiIndexService({
      esClient: this.esClient,
      logger: aiIndexLogger,
      managedBootstrap: {
        isManaged: (id) => this.aiIndexRegistry.has(id),
        getManagedIds: () => this.aiIndexRegistry.getManagedIds(),
        ensure: ensureAiIndex,
      },
    });

    this.signalsService = new SignalsService({
      esClient: this.esClient,
      logger: this.logger.get('signals'),
    });
    const signalsService = this.signalsService;

    const improvementsLogger = this.logger.get('improvements');
    this.createImprovementsService = (esClient: ElasticsearchClient, spaceId: string) =>
      new ImprovementsService({ esClient, logger: improvementsLogger, space: spaceId });
    const createImprovementsService = this.createImprovementsService;

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

    const soClient = coreStart.savedObjects.createInternalRepository();
    const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(soClient);

    this.isFeedbackLoopEnabled = async () =>
      (await globalUiSettings.get<boolean>(CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID)) ??
      false;

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
      ensureAiIndex,
      getSignalsService: () => signalsService,
      getImprovementsService: (esClient, spaceId) => createImprovementsService(esClient, spaceId),
    };
  }

  stop() {}
}
