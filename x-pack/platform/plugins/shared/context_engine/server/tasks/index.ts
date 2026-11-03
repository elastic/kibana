/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  ElasticsearchClient,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import type { KiVerifierWorkflowRunner } from '../ki_verification';
import { createAiIndexDataReadServiceFactory } from '../ai_indices/create_ai_index_data_read_service';
import { AiIndexRegistry } from '../ai_indices/registry';
import { createAiIndexService } from '../ai_indices/create_ai_index_service';
import type { AiIndexService } from '../ai_indices/service';
import { createImprovementsServiceFactory } from '../improvements/create_improvements_service';
import type { ImprovementsService } from '../improvements/service';
import { registerContextEngineSteps } from '../step_types/register_steps';
import { ContextEngineAnalyticsService } from '../telemetry/analytics_service';
import { createIsFeedbackLoopEnabled } from '../utils/is_feedback_loop_enabled';
import type { ContextEngineTasksStart } from './bridge';
import { contextEngineBridge } from './bridge';

export type { ContextEngineTasksStart } from './bridge';

interface TasksSetupDeps {
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
  /** The workflows management API (its tasks entry); a cycle in TypeScript references keeps the full type out of here. */
  workflowsManagement?: { management: KiVerifierWorkflowRunner };
}

interface TasksStartDeps {
  security: SecurityTasksStart;
  spaces?: SpacesTasksStart;
}

/**
 * The workflow steps of Context Engine for a task pod: the same KI and feedback analysis step
 * definitions Kibana registers, built by the same function over the services a pod has. Registering
 * through the workflows extensions tasks contract is safe in Kibana, where it is a no-op because the
 * `server` entry registered the steps.
 *
 * What a pod does not have: workflow KI verifiers (they run another workflow through workflows
 * management, which a pod has through its tasks entry; the built-in verifiers work too), and the AI indices that other plugins register as managed at
 * setup (they are materialized in a space by Kibana's server entry).

 * It also hands the AI index services to the tasks entries of plugins that use them (the agent
 * builder tools). The signal generator task, the routes, the UI settings and the usage collector stay in Kibana.
 */
class ContextEngineTasksPlugin
  implements TasksPlugin<void, ContextEngineTasksStart, TasksSetupDeps, TasksStartDeps>
{
  private readonly aiIndexRegistry = new AiIndexRegistry();
  private aiIndexService?: AiIndexService;
  private createImprovementsService?: (
    esClient: ElasticsearchClient,
    spaceId: string
  ) => ImprovementsService;
  private isFeedbackLoopEnabled: () => Promise<boolean> = async () => false;

  constructor(private readonly context: PluginInitializerContext) {}

  setup(
    core: CoreTasksSetup<TasksStartDeps>,
    { workflowsExtensions, workflowsManagement }: TasksSetupDeps
  ) {
    const logger = this.context.logger.get();

    const analyticsService = new ContextEngineAnalyticsService(
      core.analytics,
      logger.get('telemetry')
    );
    try {
      analyticsService.registerContextEngineEventTypes();
    } catch {
      // In Kibana the `server` entry registered the event types already.
    }

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

    registerContextEngineSteps({
      workflowsExtensions,
      getStartServices: core.getStartServices,
      analyticsService,
      getAiIndexService,
      getImprovementsService,
      isFeedbackLoopEnabled: () => this.isFeedbackLoopEnabled(),
      // Verifier workflows run through the workflows management API of its tasks entry.
      getWorkflowsManagement: async () => workflowsManagement?.management,
      logger: logger.get('context_steps'),
      feedbackAnalysisLogger: logger.get('feedback_analysis'),
    });
  }

  start(core: CoreTasksStart, { spaces }: Partial<TasksStartDeps> = {}): ContextEngineTasksStart {
    const logger = this.context.logger.get();
    this.aiIndexRegistry.freeze();
    const aiIndexService = createAiIndexService({
      esClient: core.elasticsearch.client.asInternalUser,
      logger: logger.get('ai_indices'),
      registry: this.aiIndexRegistry,
      coreStart: core,
    });
    this.aiIndexService = aiIndexService;
    this.createImprovementsService = createImprovementsServiceFactory(logger.get('improvements'));
    this.isFeedbackLoopEnabled = createIsFeedbackLoopEnabled(core);

    // In Kibana the plugin's own services are the ones that know the managed AI indices.
    const real = contextEngineBridge.getStart();
    if (real) return real;

    return {
      getAiIndexService: () => aiIndexService,
      getAiIndexDataReadService: createAiIndexDataReadServiceFactory({
        coreStart: core,
        spaces,
        aiIndexService,
        logger,
      }),
    };
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new ContextEngineTasksPlugin(context);
