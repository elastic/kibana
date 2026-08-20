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
import { registerSignalRoutes } from './routes/signals';
import { AiIndexService } from './ai_indices/service';
import { AiIndexRegistry } from './ai_indices/registry';
import { SignalsService } from './signals/service';
import type { SignalsServiceApi } from './signals/service';
import { registerSignalGeneratorTaskDefinition, scheduleSignalGenerator } from './tasks';
import { createVerifyKiStepDefinition } from './step_types/verify_ki_step';
import { registerStepDefinitions } from './step_types';

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
  private esClient?: ElasticsearchClient;
  private isFeedbackLoopEnabled: () => Promise<boolean> = async () => false;
  private readonly aiIndexRegistry = new AiIndexRegistry();

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>,
    setupDeps: ContextEngineSetupDependencies
  ): ContextEnginePluginSetup {
    registerFeatures({ features: setupDeps.features });

    setupDeps.workflowsExtensions.registerStepDefinition(
      createVerifyKiStepDefinition(coreSetup, this.logger.get('ki_verification'))
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

    const router = coreSetup.http.createRouter();
    registerAiIndexRoutes({
      router,
      getAiIndexService: () => {
        if (!this.aiIndexService) {
          throw new Error('AI index service not available — plugin has not started');
        }
        return this.aiIndexService;
      },
      getActions: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.actions;
      },
    });

    registerStepDefinitions({
      workflowsExtensions: setupDeps.workflowsExtensions,
      getAiIndexService: () => {
        if (!this.aiIndexService) {
          throw new Error('AI index service not available — plugin has not started');
        }
        return this.aiIndexService;
      },
      isContextEngineEnabled: async (request) => {
        const [coreStart] = await coreSetup.getStartServices();
        const soClient = coreStart.savedObjects.getScopedClient(request);
        const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);
        return (await uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)) ?? false;
      },
      checkWritePrivilege: async (request) => {
        const [, startDeps] = await coreSetup.getStartServices();
        const { security, spaces } = startDeps;
        if (!security) {
          return true;
        }
        const spaceId = spaces?.spacesService.getSpaceId(request) ?? 'default';
        const { hasAllRequested } = await security.authz
          .checkPrivilegesWithRequest(request)
          .atSpace(spaceId, {
            kibana: [security.authz.actions.api.get(apiPrivileges.writeContextEngine)],
          });
        return hasAllRequested;
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
    };
  }

  stop() {}
}
