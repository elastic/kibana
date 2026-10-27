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
import {
  CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID,
  CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID } from '../common/constants';
import { apiPrivileges } from '../common/features';
import { DEFAULT_MEMORY_DREAMING_INTERVAL, SHORT_TERM_MEMORY_AI_INDEX_ID } from '../common/memory';
import { validateMemoryDreamingInterval } from '../common/validation';
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
import { registerMemoryRoutes } from './routes/memory';
import { getMemoryUser } from './memory/current_user';
import { createMemoryDreamingScheduler } from './memory/dreaming/schedule';
import type { MemoryDreamingScheduler } from './memory/dreaming/schedule';
import { registerMemoryDreamingTaskDefinition } from './memory/dreaming/task';
import { registerContextEngineInferenceFeatures } from './memory/dreaming/inference_features';
import { registerMemoryStores } from './memory/register_memory_stores';
import { MemoryService } from './memory/service';
import type { MemoryServiceApi } from './memory/service';
import type {
  FeedbackAnalysisScheduleService,
  WorkflowEnablementApi,
} from './feedback_analysis/schedule';
import { createFeedbackAnalysisScheduleService } from './feedback_analysis/schedule';
import { AiIndexDataReadService } from './ai_indices/data_read_service';
import { AiIndexService } from './ai_indices/service';
import { AiIndexRegistry } from './ai_indices/registry';
import { ImprovementsService } from './improvements/service';
import { installImprovementsIndexTemplate } from './improvements/storage';
import { SignalsService } from './signals/service';
import type { SignalsServiceApi } from './signals/service';
import { registerSignalGeneratorTaskDefinition, scheduleSignalGenerator } from './tasks';
import { createVerifyKiStepDefinition } from './step_types/verify_ki_step';
import { createVerifyKi } from './step_types/verify_ki';
import { registerStepDefinitions } from './step_types';
import { ContextEngineAnalyticsService } from './telemetry';
import { isContextEngineEnabledInSpace } from './utils/is_context_engine_enabled_in_space';
import { resolveSpaceId } from './utils/resolve_space_id';

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
  /** Reads the global memory flag as the internal user, for work that has no request. */
  private isMemoryEnabledInternal: () => Promise<boolean> = async () => false;
  private createMemoryService?: (request: KibanaRequest) => MemoryServiceApi;
  private dreamingScheduler?: MemoryDreamingScheduler;
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
    if (setupDeps.searchInferenceEndpoints) {
      registerContextEngineInferenceFeatures({
        searchInferenceEndpoints: setupDeps.searchInferenceEndpoints,
        logger: this.logger,
      });
    }
    this.setupWorkflowsManagement(coreSetup);

    this.workflowsManagement = setupDeps.workflowsManagement?.management;

    this.analyticsService = new ContextEngineAnalyticsService(
      coreSetup.analytics,
      this.logger.get('telemetry')
    );
    this.analyticsService.registerContextEngineEventTypes();
    const analyticsService = this.analyticsService;

    const checkApiPrivileges = async (
      request: KibanaRequest,
      spaceId: string,
      actions: readonly string[]
    ): Promise<boolean> => {
      const [, startDeps] = await coreSetup.getStartServices();
      const { security } = startDeps;
      if (!security) {
        return true;
      }
      const { hasAllRequested } = await security.authz
        .checkPrivilegesWithRequest(request)
        .atSpace(spaceId, {
          kibana: actions.map((action) => security.authz.actions.api.get(action)),
        });
      return hasAllRequested;
    };

    const verifyKi = createVerifyKi({
      getAuditLogger: async (request) => {
        const [coreStart] = await coreSetup.getStartServices();
        return coreStart.security.audit.asScoped(request);
      },
      workflowVerifierDeps: {
        getWorkflowsManagement: () => this.workflowsManagementApiPromise,
        checkExecutePrivilege: (request, spaceId) =>
          checkApiPrivileges(request, spaceId, WorkflowsManagementOperationPrivileges.execute),
      },
      analyticsService,
      logger: this.logger.get('context_steps'),
    });
    setupDeps.workflowsExtensions.registerStepDefinition(
      createVerifyKiStepDefinition(coreSetup, verifyKi)
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
      [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: {
        name: i18n.translate('xpack.contextEngine.uiSettings.memory.name', {
          defaultMessage: 'Context Engine memory',
        }),
        description: i18n.translate('xpack.contextEngine.uiSettings.memory.description', {
          defaultMessage:
            'Turns on Context Engine memory in every space: the short-term and long-term memory stores, the remember and forget tools, and dreaming.',
        }),
        schema: schema.boolean(),
        value: false,
        experimental: true,
        requiresPageReload: false,
        readonly: false,
      },
    });

    coreSetup.uiSettings.register({
      [CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID]: {
        name: i18n.translate('xpack.contextEngine.uiSettings.memoryDreamingInterval.name', {
          defaultMessage: 'Context Engine memory dreaming interval',
        }),
        description: i18n.translate(
          'xpack.contextEngine.uiSettings.memoryDreamingInterval.description',
          {
            defaultMessage:
              'How often dreaming turns the short-term memories in this space into long-term memories, for example 12h or 1d. Must be at least 60 minutes.',
          }
        ),
        schema: schema.string({ maxLength: 16, validate: validateMemoryDreamingInterval }),
        value: DEFAULT_MEMORY_DREAMING_INTERVAL,
        experimental: true,
        requiresPageReload: false,
        readonly: false,
      },
    });

    registerMemoryStores({
      registry: this.aiIndexRegistry,
      isMemoryEnabled: () => this.isMemoryEnabledInternal(),
    });

    registerMemoryDreamingTaskDefinition({
      taskManager: setupDeps.taskManager,
      getDeps: async () => {
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        return {
          esClient: coreStart.elasticsearch.client.asInternalUser,
          inference: startDeps.inference,
          searchInferenceEndpoints: startDeps.searchInferenceEndpoints,
          isMemoryEnabled: () => this.isMemoryEnabledInternal(),
          isContextEngineEnabled: (spaceId) =>
            isContextEngineEnabledInSpace({
              savedObjects: coreStart.savedObjects,
              uiSettings: coreStart.uiSettings,
              spaceId,
            }),
          getInterval: async (spaceId) => {
            const soClient = coreStart.savedObjects
              .getUnsafeInternalClient()
              .asScopedToNamespace(spaceId);
            const interval = await coreStart.uiSettings
              .asScopedToClient(soClient)
              .get<string>(CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID);
            return interval && validateMemoryDreamingInterval(interval) === undefined
              ? interval
              : DEFAULT_MEMORY_DREAMING_INTERVAL;
          },
        };
      },
      logger: this.logger.get('memory_dreaming'),
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
      verifyKi,
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

    registerMemoryRoutes({
      router,
      logger: this.logger.get('memory'),
      getSpaces: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.spaces;
      },
      getMemoryService: async ({ request }) => {
        await coreSetup.getStartServices();
        if (!this.createMemoryService) {
          throw new Error('Memory service not available — plugin has not started');
        }
        return this.createMemoryService(request);
      },
      getDreamingScheduler: () => {
        if (!this.dreamingScheduler) {
          throw new Error('Dreaming scheduler not available — plugin has not started');
        }
        return this.dreamingScheduler;
      },
      getMemoryUser: async (request) => {
        const [coreStart] = await coreSetup.getStartServices();
        return getMemoryUser({
          request,
          security: coreStart.security,
          esClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
        });
      },
      isMemoryEnabled,
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
        getRegistration: (id) => this.aiIndexRegistry.get(id),
        ensure: ensureAiIndex,
        getUnavailableIds: () => this.aiIndexRegistry.getUnavailableIds(),
      },
    });
    const aiIndexService = this.aiIndexService;

    this.signalsService = new SignalsService({
      esClient: this.esClient,
      logger: this.logger.get('signals'),
    });
    const signalsService = this.signalsService;

    const improvementsLogger = this.logger.get('improvements');
    this.createImprovementsService = (esClient: ElasticsearchClient, spaceId: string) =>
      new ImprovementsService({ esClient, logger: improvementsLogger, space: spaceId });
    const createImprovementsService = this.createImprovementsService;

    this.createAiIndexDataReadService = ({ esClient, request }) =>
      new AiIndexDataReadService({
        esClient,
        spaceId: resolveSpaceId(startDeps.spaces, request),
        auditLogger: coreStart.security.audit.asScoped(request),
        aiIndexService,
        logger: this.logger,
        isMemoryEnabled: async () => {
          const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
          const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);
          return (
            (await globalUiSettings.get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID)) ?? false
          );
        },
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

    const soClient = coreStart.savedObjects.createInternalRepository();
    const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(soClient);

    this.isFeedbackLoopEnabled = async () =>
      (await globalUiSettings.get<boolean>(CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID)) ??
      false;
    this.isMemoryEnabledInternal = async () =>
      (await globalUiSettings.get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID)) ?? false;

    const memoryLogger = this.logger.get('memory');
    const internalEsClient = this.esClient;
    this.createMemoryService = (request) => {
      const spaceId = resolveSpaceId(startDeps.spaces, request);
      return new MemoryService({
        spaceId,
        esClient: internalEsClient,
        logger: memoryLogger,
        isContextEngineEnabled: () =>
          isContextEngineEnabledInSpace({
            savedObjects: coreStart.savedObjects,
            uiSettings: coreStart.uiSettings,
            spaceId,
          }),
        isMemoryEnabled: async () => {
          const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
          return (
            (await coreStart.uiSettings
              .globalAsScopedToClient(savedObjectsClient)
              .get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID)) ?? false
          );
        },
        hasWritePrivilege: async () => {
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
        },
        getCurrentUser: () =>
          getMemoryUser({
            request,
            security: coreStart.security,
            esClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
          }),
        ensureStore: async () => {
          await ensureAiIndex(SHORT_TERM_MEMORY_AI_INDEX_ID, spaceId);
        },
      });
    };
    const createMemoryService = this.createMemoryService;

    this.dreamingScheduler = createMemoryDreamingScheduler({
      getTaskManager: async () => startDeps.taskManager,
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
      getAiIndexDataReadService: (params) => createAiIndexDataReadService(params),
      getSignalsService: () => signalsService,
      getImprovementsService: (esClient, spaceId) => createImprovementsService(esClient, spaceId),
      getMemoryService: ({ request }) => createMemoryService(request),
      isMemoryEnabled: () => this.isMemoryEnabledInternal(),
    };
  }

  stop() {}
}
