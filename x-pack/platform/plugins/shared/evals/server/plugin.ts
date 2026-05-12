/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import type { EvalsConfig } from './config';
import {
  EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
  evalsRemoteKibanaConfigSavedObjectType,
} from './saved_objects/remote_kibana_config';
import type {
  EvalsRequestHandlerContext,
  EvalsPluginSetup,
  EvalsPluginStart,
  EvalsSetupDependencies,
  EvalsStartDependencies,
  AgentBuilderContractLike,
} from './types';
import { registerRoutes } from './routes/register_routes';
import { DatasetService } from './storage/dataset_service';
import { ensureAesopILMPolicy } from './lib/aesop/storage/index_lifecycle';
import { EvaluatorRegistry, getPrebuiltEvaluators } from './lib/evaluation_engine';
import { SkillMonitoringService } from './lib/monitoring/skill_monitoring_service';
import { evaluatorSavedObjectType, EVALUATOR_SAVED_OBJECT_TYPE } from './storage/evaluator_storage';
import type { CustomEvaluatorAttributes } from './storage/evaluator_storage';
import { buildCustomEvaluator } from './routes/evaluators/build_custom_evaluator';
import {
  proposedSkillSavedObjectType,
  PROPOSED_SKILL_SAVED_OBJECT_TYPE,
} from './storage/skill_storage';
import { SkillValidationService } from './lib/aesop';
import { SkillOnlineEvalService } from './lib/aesop/skill_online_eval_service';
import { SuiteRunner } from './lib/suite_runner';

export class EvalsPlugin
  implements
    Plugin<EvalsPluginSetup, EvalsPluginStart, EvalsSetupDependencies, EvalsStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: EvalsConfig;
  private readonly isServerless: boolean;
  private datasetService?: DatasetService;
  private actionsStart?: EvalsStartDependencies['actions'];
  private evaluatorRegistry?: EvaluatorRegistry;
  private monitoringService?: SkillMonitoringService;
  private skillValidationService?: SkillValidationService;
  private skillOnlineEvalService?: SkillOnlineEvalService;
  private suiteRunner?: SuiteRunner;

  constructor(context: PluginInitializerContext<EvalsConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(
    coreSetup: CoreSetup<EvalsStartDependencies, EvalsPluginStart>,
    { features, encryptedSavedObjects }: EvalsSetupDependencies
  ): EvalsPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Evals plugin is disabled');
      return {
        registerEvaluator: () => {},
      };
    }

    this.logger.info('Setting up Evals plugin');
    this.datasetService = new DatasetService(this.logger, this.isServerless);

    this.evaluatorRegistry = new EvaluatorRegistry(this.logger);

    // Register prebuilt skill evaluators (LLM-judge backed)
    for (const evaluator of getPrebuiltEvaluators()) {
      this.evaluatorRegistry.register(evaluator);
    }

    this.monitoringService = new SkillMonitoringService(this.logger);

    coreSetup.savedObjects.registerType(evaluatorSavedObjectType);
    if (this.config.aesop.enabled) {
      coreSetup.savedObjects.registerType(proposedSkillSavedObjectType);
    }
    coreSetup.savedObjects.registerType(evalsRemoteKibanaConfigSavedObjectType);
    encryptedSavedObjects.registerType({
      type: EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['createdAt', 'url']),
    });

    if (this.config.aesop.enabled) {
      this.skillValidationService = new SkillValidationService(this.evaluatorRegistry, this.logger);
      this.skillOnlineEvalService = new SkillOnlineEvalService(
        this.evaluatorRegistry,
        this.datasetService!,
        this.logger
      );
    }

    // Resolve repo root from plugin location for suite runner
    // Plugin is at: x-pack/platform/plugins/shared/evals/server/plugin.ts
    // __dirname = .../evals/server → 6 hops: server → evals → shared → plugins → platform → x-pack → root
    const repoRoot = resolve(__dirname, '..', '..', '..', '..', '..', '..');
    const { hostname, port, protocol } = coreSetup.http.getServerInfo();
    const kibanaUrl = `${protocol}://${hostname}:${port}`;

    // Extract ES URL from CLI args (--elasticsearch.hosts=http://...) since
    // coreSetup doesn't expose the raw elasticsearch config URL.
    const esArg = process.argv.find((arg) => arg.startsWith('--elasticsearch.hosts='));
    const elasticsearchUrl = esArg?.split('=')[1] ?? 'http://localhost:9200';

    this.suiteRunner = new SuiteRunner(repoRoot, this.logger, { kibanaUrl, elasticsearchUrl });

    // Resolve agentBuilder via runtimePluginDependencies to avoid circular dep
    // (agentBuilder optionally depends on evals). Contract shape is erased via
    // AgentBuilderContractLike - see server/types.ts for the tech-debt rationale.
    const agentBuilderStartPromise = coreSetup.plugins
      .onStart<{ agentBuilder: AgentBuilderContractLike }>('agentBuilder')
      .then(({ agentBuilder }) => (agentBuilder.found ? agentBuilder.contract : undefined));

    coreSetup.http.registerRouteHandlerContext<EvalsRequestHandlerContext, 'evals'>(
      'evals',
      async () => {
        if (!this.datasetService) {
          throw new Error('DatasetService has not been initialized');
        }

        return {
          datasetService: this.datasetService,
          getActionsStart: () => this.actionsStart,
          getAgentBuilderStart: () => agentBuilderStartPromise,
        };
      }
    );

    const allSoTypes = this.config.aesop.enabled
      ? [EVALUATOR_SAVED_OBJECT_TYPE, PROPOSED_SKILL_SAVED_OBJECT_TYPE]
      : [EVALUATOR_SAVED_OBJECT_TYPE];

    features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      order: 9000,
      category: DEFAULT_APP_CATEGORIES.management,
      app: ['kibana', PLUGIN_ID],
      management: { ai: [PLUGIN_ID] },
      privileges: {
        all: {
          app: ['kibana', PLUGIN_ID],
          api: [PLUGIN_ID],
          management: { ai: [PLUGIN_ID] },
          savedObject: {
            all: allSoTypes,
            read: [],
          },
          ui: ['show'],
        },
        read: {
          app: ['kibana', PLUGIN_ID],
          api: [PLUGIN_ID],
          management: { ai: [PLUGIN_ID] },
          savedObject: {
            all: [],
            read: allSoTypes,
          },
          ui: ['show'],
        },
      },
    });

    const router = coreSetup.http.createRouter<EvalsRequestHandlerContext>();
    const internalRemoteConfigsSoClientPromise = coreSetup.getStartServices().then(([coreStart]) =>
      coreStart.savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE],
      })
    );

    registerRoutes({
      router,
      logger: this.logger,
      evaluatorRegistry: this.evaluatorRegistry,
      monitoringService: this.monitoringService,
      skillValidationService: this.skillValidationService,
      skillOnlineEvalService: this.skillOnlineEvalService,
      suiteRunner: this.suiteRunner,
      repoRoot,
      canEncrypt: encryptedSavedObjects.canEncrypt,
      getEncryptedSavedObjectsStart: () =>
        coreSetup.getStartServices().then(([, pluginsStart]) => pluginsStart.encryptedSavedObjects),
      getInternalRemoteConfigsSoClient: () => internalRemoteConfigsSoClientPromise,
      aesopEnabled: this.config.aesop.enabled,
    });

    return {
      registerEvaluator: (evaluator) => {
        if (!this.evaluatorRegistry) {
          throw new Error('EvaluatorRegistry has not been initialized');
        }
        this.evaluatorRegistry.register(evaluator);
      },
    };
  }

  start(core: CoreStart, plugins: EvalsStartDependencies): EvalsPluginStart {
    this.actionsStart = plugins.actions;

    // Load custom evaluators from saved objects asynchronously (fire-and-forget).
    if (this.evaluatorRegistry && this.config.enabled) {
      const registry = this.evaluatorRegistry;
      const logger = this.logger;

      const loadCustomEvaluators = async () => {
        try {
          const soClient = core.savedObjects.createInternalRepository([
            EVALUATOR_SAVED_OBJECT_TYPE,
          ]);
          const findResult = await soClient.find<CustomEvaluatorAttributes>({
            type: EVALUATOR_SAVED_OBJECT_TYPE,
            perPage: 1000,
          });

          for (const so of findResult.saved_objects) {
            const { name, description, type, config } = so.attributes;
            const evaluator = buildCustomEvaluator(
              name,
              description,
              type,
              config as Record<string, unknown>
            );
            registry.register(evaluator);
          }

          logger.info(
            `Loaded ${findResult.saved_objects.length} custom evaluator(s) from saved objects`
          );
        } catch (error) {
          logger.error(`Failed to load custom evaluators from saved objects: ${error}`);
        }
      };

      void loadCustomEvaluators();
    }

    // ═══════════════════════════════════════════════════════════════
    // AESOP: Ensure ILM policy exists for all .aesop-* indices (flag-gated)
    // ═══════════════════════════════════════════════════════════════
    if (this.config.aesop.enabled) {
      const internalClient = core.elasticsearch.client.asInternalUser;
      ensureAesopILMPolicy(internalClient, this.logger).catch((err) => {
        this.logger.warn(
          `[AESOP] ILM policy setup failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }

    return {
      datasetService: this.datasetService,
    };
  }

  stop() {}
}
