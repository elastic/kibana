/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { InferenceTasksStart } from '@kbn/inference-plugin/server/tasks';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import type { EvalsConfig } from '../config';
import { configSchema } from '../config';
import { createEvaluatorRegistry } from '../evaluators/registry';
import type { EvaluatorRegistry } from '../evaluators/types';
import { createListEvaluators, createListModelConnectors } from '../runtime';
import { DatasetService } from '../storage/datasets/dataset_service';
import { EvaluatorDefinitionService } from '../storage/evaluators/evaluator_definition_service';
import { createTaskProviderRegistry } from '../task_providers/registry';
import type { EvalsPluginSetup, EvalsPluginStart } from '../types';
import { registerEvalsWorkflowSteps } from '../workflows';

export const config: PluginConfigDescriptor<EvalsConfig> = { schema: configSchema };

/** What other tasks entries use of Evals in a task pod: the datasets, evaluators and connectors. */
export type EvalsTasksStart = Pick<
  EvalsPluginStart,
  'datasetService' | 'listEvaluators' | 'listModelConnectors'
>;

interface TasksSetupDeps {
  workflowsExtensions?: WorkflowsExtensionsTasksSetup;
}

interface TasksStartDeps {
  inference: InferenceTasksStart;
}

/**
 * The evals product for a task pod: its `ai.evals.*` workflow steps and the services its Agent
 * Builder skills use, built as the `server` entry builds them (same `xpack.evals` config, so nothing
 * is registered unless Evals is enabled in `full` mode). Task providers and evaluators other plugins
 * register on Evals are only there if those plugins have a tasks entry and register them here. Routes,
 * the feature, saved objects and data streams belong to Kibana.
 */
class EvalsTasksPlugin
  implements TasksPlugin<EvalsPluginSetup, EvalsTasksStart, TasksSetupDeps, TasksStartDeps>
{
  private readonly logger;
  private readonly config: EvalsConfig;
  private readonly isServerless: boolean;
  private evaluatorRegistry?: EvaluatorRegistry;
  private evaluatorDefinitionService?: EvaluatorDefinitionService;
  private started = false;

  constructor(context: PluginInitializerContext<EvalsConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(
    core: CoreTasksSetup<TasksStartDeps>,
    { workflowsExtensions }: TasksSetupDeps
  ): EvalsPluginSetup {
    const { enabled, mode } = this.config;
    if (!enabled) {
      return {
        enabled: false,
        mode,
        registerTaskProvider: () => {},
        registerEvaluator: () => {},
      };
    }

    const taskProviderRegistry = createTaskProviderRegistry();
    // In runtime mode the user-defined store is never created, so only built-ins resolve.
    const evaluatorRegistry = createEvaluatorRegistry({
      getDefinitionClient: ({ spaceId }) => this.evaluatorDefinitionService?.getClient({ spaceId }),
    });
    this.evaluatorRegistry = evaluatorRegistry;

    if (mode === 'full' && workflowsExtensions) {
      registerEvalsWorkflowSteps(workflowsExtensions, {
        logger: this.logger,
        taskProviderRegistry,
        getInferenceStart: () =>
          core.getStartServices().then(([, pluginsStart]) => pluginsStart.inference),
      });
    }

    return {
      enabled: true,
      mode,
      registerTaskProvider: (provider) => taskProviderRegistry.register(provider),
      registerEvaluator: (definition) => {
        if (this.started) {
          throw new Error(
            `Cannot register evaluator "${definition.name}": evaluators must be registered during setup`
          );
        }
        evaluatorRegistry.register(definition);
      },
    };
  }

  start(core: CoreTasksStart, { inference }: TasksStartDeps): EvalsTasksStart {
    const evaluatorRegistry = this.evaluatorRegistry;
    if (!this.config.enabled || !evaluatorRegistry) return {};
    this.started = true;
    if (this.config.mode !== 'full') return {};

    const esClient = core.elasticsearch.client.asInternalUser;
    this.evaluatorDefinitionService = new EvaluatorDefinitionService(
      this.logger,
      esClient,
      this.isServerless,
      evaluatorRegistry.isBuiltIn
    );

    return {
      datasetService: new DatasetService(this.logger, esClient, this.isServerless),
      listEvaluators: createListEvaluators(evaluatorRegistry),
      listModelConnectors: createListModelConnectors(inference),
    };
  }
}

export const plugin = async (context: PluginInitializerContext<EvalsConfig>) =>
  new EvalsTasksPlugin(context);
