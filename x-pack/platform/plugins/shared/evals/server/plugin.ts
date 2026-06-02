/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { ExperimentSuiteRegistry } from './experiments/registry';
import { getEvalsRunSuiteStepDefinition } from './workflows_steps/run_suite';
import { clusterHealthExperimentSuite } from './experiments/built_in/cluster_health_suite';
import { experimentSuiteDefinitions } from './experiments/suite_definitions';

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
  private experimentSuiteRegistry?: ExperimentSuiteRegistry;
  // Single shutdown latch shared by all in-flight async work the plugin
  // owns (today: AESOP exploration runs). `stop()` aborts it so callers
  // can mark themselves failed and stop scheduling new work.
  private readonly stopController = new AbortController();

  constructor(context: PluginInitializerContext<EvalsConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<EvalsStartDependencies, EvalsPluginStart>,
    {
      features,
      encryptedSavedObjects,
      workflowsManagement,
      workflowsExtensions,
    }: EvalsSetupDependencies
  ): EvalsPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Evals plugin is disabled');
      return {
        registerEvaluator: () => {},
        registerExperimentSuite: () => undefined,
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

    this.experimentSuiteRegistry = new ExperimentSuiteRegistry();
    for (const suite of experimentSuiteDefinitions) {
      this.experimentSuiteRegistry.register(suite);
    }
    this.experimentSuiteRegistry.register(clusterHealthExperimentSuite);

    if (workflowsExtensions) {
      workflowsExtensions.registerStepDefinition(
        getEvalsRunSuiteStepDefinition({
          coreSetup,
          experimentSuiteRegistry: this.experimentSuiteRegistry,
          datasetService: this.datasetService,
        })
      );
    } else {
      this.logger.warn(
        'workflowsExtensions plugin is not available — the Experiments tab will list ' +
          'suites but "Run now" requests will fail with 503 until the plugin is enabled.'
      );
    }
    if (!workflowsManagement) {
      this.logger.warn(
        'workflowsManagement plugin is not available — Experiments cannot be dispatched, ' +
          'inspected, or cancelled. Enable the workflowsManagement plugin to use Experiments.'
      );
    }

    coreSetup.savedObjects.registerType(evaluatorSavedObjectType);
    if (this.config.aesop.enabled) {
      coreSetup.savedObjects.registerType(proposedSkillSavedObjectType);
    } else {
      this.logger.info(
        'AESOP feature is disabled. Set `xpack.evals.aesop.enabled: true` in kibana.yml ' +
          'to enable the autonomous exploration UI, AESOP routes, and the proposed-skill ' +
          'saved object type.'
      );
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
      experimentSuiteRegistry: this.experimentSuiteRegistry,
      workflowsManagement,
      workflowsExtensions,
      canEncrypt: encryptedSavedObjects.canEncrypt,
      getEncryptedSavedObjectsStart: () =>
        coreSetup.getStartServices().then(([, pluginsStart]) => pluginsStart.encryptedSavedObjects),
      getInternalRemoteConfigsSoClient: () => internalRemoteConfigsSoClientPromise,
      aesopEnabled: this.config.aesop.enabled,
      aesopRateLimits: this.config.aesop.rateLimits,
      aesopExplorationTimeoutMs: this.config.aesop.explorationTimeoutMs,
      pluginStopSignal: this.stopController.signal,
    });

    return {
      registerEvaluator: (evaluator) => {
        if (!this.evaluatorRegistry) {
          throw new Error('EvaluatorRegistry has not been initialized');
        }
        this.evaluatorRegistry.register(evaluator);
      },
      registerExperimentSuite: (definition) => this.experimentSuiteRegistry?.register(definition),
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

  /**
   * Plugin shutdown hook.
   *
   * Aborts {@link stopController} so any AESOP exploration runs in flight
   * race the abort signal in their main `Promise.race` loop and mark
   * themselves failed in the state tracker. This avoids the previously
   * observed footgun where, after a Kibana restart, the UI would still
   * show "running" explorations forever because the executor process had
   * died mid-phase. The actual ES/LLM calls in flight are NOT cancelled —
   * AbortController plumbing into every downstream service is tracked
   * separately. Background work drains and its later errors are ignored.
   *
   * Safe to call multiple times: `AbortController.abort()` is idempotent.
   */
  stop() {
    if (!this.stopController.signal.aborted) {
      this.logger.info(
        '[Evals] Plugin stopping; aborting in-flight AESOP exploration runs (state tracker will mark them failed).'
      );
      this.stopController.abort();
    }
  }
}
