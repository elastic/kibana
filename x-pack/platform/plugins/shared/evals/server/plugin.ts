/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import type { EvalsConfig } from './config';
import type {
  EvalsRequestHandlerContext,
  EvalsPluginSetup,
  EvalsPluginStart,
  EvalsSetupDependencies,
  EvalsStartDependencies,
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
  }

  setup(
    coreSetup: CoreSetup<EvalsStartDependencies, EvalsPluginStart>,
    { features }: EvalsSetupDependencies
  ): EvalsPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Evals plugin is disabled');
      return {
        registerEvaluator: () => {},
      };
    }

    this.logger.info('Setting up Evals plugin');
    this.datasetService = new DatasetService(this.logger);

    this.evaluatorRegistry = new EvaluatorRegistry(this.logger);

    // Register prebuilt skill evaluators (LLM-judge backed)
    for (const evaluator of getPrebuiltEvaluators()) {
      this.evaluatorRegistry.register(evaluator);
    }

    this.monitoringService = new SkillMonitoringService(this.logger);

    coreSetup.savedObjects.registerType(evaluatorSavedObjectType);
    coreSetup.savedObjects.registerType(proposedSkillSavedObjectType);

    this.skillValidationService = new SkillValidationService(this.evaluatorRegistry, this.logger);
    this.skillOnlineEvalService = new SkillOnlineEvalService(
      this.evaluatorRegistry,
      this.datasetService!,
      this.logger
    );

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
    // (agentBuilder optionally depends on evals)
    const agentBuilderStartPromise = coreSetup.plugins
      .onStart<{ agentBuilder: any }>('agentBuilder')
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
            all: [EVALUATOR_SAVED_OBJECT_TYPE, PROPOSED_SKILL_SAVED_OBJECT_TYPE],
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
            read: [EVALUATOR_SAVED_OBJECT_TYPE, PROPOSED_SKILL_SAVED_OBJECT_TYPE],
          },
          ui: ['show'],
        },
      },
    });

    const router = coreSetup.http.createRouter<EvalsRequestHandlerContext>();
    registerRoutes({
      router,
      logger: this.logger,
      evaluatorRegistry: this.evaluatorRegistry,
      monitoringService: this.monitoringService,
      skillValidationService: this.skillValidationService,
      skillOnlineEvalService: this.skillOnlineEvalService,
      suiteRunner: this.suiteRunner,
      repoRoot,
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

  async start(core: CoreStart, plugins: EvalsStartDependencies): Promise<EvalsPluginStart> {
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

      loadCustomEvaluators();
    }

    // ═══════════════════════════════════════════════════════════════
    // AESOP: Ensure ILM policy exists for all .aesop-* indices
    // ═══════════════════════════════════════════════════════════════
    const internalClient = core.elasticsearch.client.asInternalUser;
    ensureAesopILMPolicy(internalClient, this.logger).catch((err) => {
      this.logger.warn(
        `[AESOP] ILM policy setup failed: ${err instanceof Error ? err.message : String(err)}`
      );
    });

    return {
      datasetService: this.datasetService,
    };
  }

  stop() {}
}
