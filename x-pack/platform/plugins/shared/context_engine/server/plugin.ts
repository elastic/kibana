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
import {
  AGENT_BUILDER_TRACES_INDEX_PATTERN,
  CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID,
  SIGNALS_AI_INDEX_ID,
} from '../common/constants';
import { SIGNALS_INDEX_NAME } from '../common/http_api/signals';
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
import { installSignalGeneratorWorkflowAndMarkReady } from './workflows';

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

    // Register the signals AI index as seeded (user-editable with sensible defaults)
    // Automations are left empty - users can add their own signal generator workflow
    this.aiIndexRegistry.registerSeeded(SIGNALS_AI_INDEX_ID, {
      description: 'Context Engine feedback loop signals generated from Agent Builder traces.',
      dest: { type: 'index', value: SIGNALS_INDEX_NAME },
      automations: [],
      sources: [
        { type: 'esql', value: `FROM ${AGENT_BUILDER_TRACES_INDEX_PATTERN}` },
      ],
    });

    // Register as a managed workflow owner if workflows_extensions is available
    if (setupDeps.workflowsExtensions) {
      setupDeps.workflowsExtensions.registerManagedWorkflowOwner('contextEngine');
    }

    return {
      registerAiIndex: (id, properties) => this.aiIndexRegistry.register(id, properties),
      registerSeededAiIndex: (id, properties) => this.aiIndexRegistry.registerSeeded(id, properties),
    };
  }

  start(coreStart: CoreStart, startDeps: ContextEngineStartDependencies): ContextEnginePluginStart {
    const aiIndexLogger = this.logger.get('ai_indices');

    this.esClient = coreStart.elasticsearch.client.asInternalUser;

    this.aiIndexService = new AiIndexService({
      esClient: this.esClient,
      logger: aiIndexLogger,
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

    // Install signal generator workflow if workflows_extensions is available
    if (startDeps.workflowsExtensions) {
      installSignalGeneratorWorkflowAndMarkReady({
        workflowsExtensions: startDeps.workflowsExtensions,
        esClient: this.esClient,
        logger: this.logger.get('workflows'),
      }).catch((err) => {
        this.logger.warn(
          `Failed to install signal generator workflow: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      });
    } else {
      this.logger.warn(
        'workflowsExtensions plugin not available — signal generation workflow will not be installed'
      );
    }

    return {};
  }

  stop() {}
}
