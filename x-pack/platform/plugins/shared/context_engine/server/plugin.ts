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
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { Logger } from '@kbn/logging';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID } from '../common/constants';
import { apiPrivileges } from '../common/features';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerAiIndexRoutes } from './routes/ai_indices';
import { registerImprovementRoutes } from './routes/improvements';
import { registerSignalRoutes } from './routes/signals';
import type { WorkflowProvider } from './workflows/provider';
import type { FeedbackAnalysisScheduleService } from './feedback_analysis/schedule';
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

/** Must match the `pluginId` on the managed workflow definition. */
const CONTEXT_ENGINE_WORKFLOW_OWNER = 'contextEngine';

const DEFAULT_SPACE_ID = 'default';

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
  private createImprovementsService?: (esClient: ElasticsearchClient) => ImprovementsService;
  private esClient?: ElasticsearchClient;
  private scheduleService?: FeedbackAnalysisScheduleService;
  /** Registered by `contextEngineAgentBuilder`, which can depend on both this plugin and workflows. */
  private workflowProvider?: WorkflowProvider;
  private spaces?: SpacesPluginStart;
  private isFeedbackLoopEnabled: () => Promise<boolean> = async () => false;
  private readonly aiIndexRegistry = new AiIndexRegistry();
  private analyticsService?: ContextEngineAnalyticsService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>,
    setupDeps: ContextEngineSetupDependencies
  ): ContextEnginePluginSetup {
    registerFeatures({ features: setupDeps.features });

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

    // Makes this plugin the owner of the feedback-analysis workflow definition. Registration alone
    // installs nothing — instances are installed per AI index when analysis is turned on.
    setupDeps.workflowsExtensions.registerManagedWorkflowOwner(CONTEXT_ENGINE_WORKFLOW_OWNER);

    const getAiIndexService = () => {
      if (!this.aiIndexService) {
        throw new Error('AI index service not available — plugin has not started');
      }
      return this.aiIndexService;
    };

    const getImprovementsService = (esClient: ElasticsearchClient) => {
      if (!this.createImprovementsService) {
        throw new Error('Improvements service not available — plugin has not started');
      }
      return this.createImprovementsService(esClient);
    };

    const getScheduleService = () => {
      if (!this.scheduleService) {
        throw new Error('Schedule service not available — plugin has not started');
      }
      return this.scheduleService;
    };

    const getSpaceId = (request: KibanaRequest) =>
      this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

    const router = coreSetup.http.createRouter();
    registerAiIndexRoutes({
      router,
      logger: this.logger.get('routes'),
      getAiIndexService,
      getImprovementsService,
      getScheduleService,
      getSpaceId,
      getActions: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.actions;
      },
    });

    const isContextEngineEnabled = async (request: KibanaRequest) => {
      const [coreStart] = await coreSetup.getStartServices();
      const soClient = coreStart.savedObjects.getScopedClient(request);
      const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);
      return (await uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)) ?? false;
    };

    const checkWritePrivilege = async (request: KibanaRequest) => {
      const [, startDeps] = await coreSetup.getStartServices();
      const { security, spaces } = startDeps;
      if (!security) {
        return true;
      }
      const spaceId = spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
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
      // The two steps an analysis run is built from. Steps rather than HTTP routes: the workflow
      // is the only caller, and both need plugin services a request could not reach any other way.
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

    const getSpaces = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.spaces;
    };

    const getActions = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.actions;
    };

    // Read-only Signals routes (reads run as the current user, scoped to the active space).
    registerSignalRoutes({
      router,
      getSpaces,
      // Reads the current value at request time (assigned in start(), after this setup() runs).
      getFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
    });

    // Improvement review: list what a run proposed, decide on one, and start a run by hand.
    registerImprovementRoutes({
      router,
      getAiIndexService,
      getImprovementsService,
      getWorkflowProvider: () => this.workflowProvider,
      getScheduleService,
      getActions,
      getSpaces,
      getFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
      logger: this.logger.get('routes'),
    });

    return {
      registerAiIndex: (id, properties) => this.aiIndexRegistry.register(id, properties),
      registerWorkflowProvider: (provider) => {
        if (this.workflowProvider) {
          throw new Error('A workflow provider is already registered for the Context Engine');
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

    const improvementsLogger = this.logger.get('improvements');
    this.createImprovementsService = (esClient: ElasticsearchClient) =>
      new ImprovementsService({ esClient, logger: improvementsLogger });
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

    this.spaces = startDeps.spaces;

    this.scheduleService = createFeedbackAnalysisScheduleService({
      logger: this.logger,
      getManagedWorkflowsClient: () =>
        startDeps.workflowsExtensions.initManagedWorkflowsClient(CONTEXT_ENGINE_WORKFLOW_OWNER),
    });

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
      getImprovementsService: (esClient) => createImprovementsService(esClient),
    };
  }

  stop() {}
}
