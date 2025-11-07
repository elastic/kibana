/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Logger,
} from '@kbn/core/server';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from '@kbn/workflows-execution-engine/common';
import type {
  CatchupAgentPluginSetup,
  CatchupAgentPluginStart,
  CatchupAgentSetupDependencies,
  CatchupAgentStartDependencies,
} from './types';
import type { CatchupAgentConfigType } from './config';
import { registerSecurityTools } from './tools/security/register_tools';
// Temporarily disabled - focusing on Security and External tools first
// import { registerObservabilityTool } from './tools/observability/register_tools';
// import { registerSearchTool } from './tools/search/register_tools';
import { registerExternalTools } from './tools/external/register_tools';
import { registerCorrelationTool } from './tools/correlation/register_tools';
import { registerSummaryTool } from './tools/summary/register_tools';
import { registerPrioritizationTools } from './tools/prioritization/register_tools';
import { registerSearchTool } from './tools/search/register_tools';
import { registerWorkflowTools } from './tools/workflow/register_tools';
import { registerCatchupAgent } from './agents/register_agent';
import { setPluginServices } from './services/service_locator';
import { registerCatchupWorkflows } from './workflows/register_workflows';

export class CatchupAgentPlugin
  implements
    Plugin<
      CatchupAgentPluginSetup,
      CatchupAgentPluginStart,
      CatchupAgentSetupDependencies,
      CatchupAgentStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly config: CatchupAgentConfigType;
  private workflowsManagement?: CatchupAgentSetupDependencies['workflowsManagement'];

  constructor(initializerContext: PluginInitializerContext) {
    // eslint-disable-next-line no-console
    console.log('[CATCHUP-AGENT] CatchupAgentPlugin constructor called');
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<CatchupAgentConfigType>();
    this.logger.info('CatchupAgentPlugin constructor called - plugin is being instantiated');
    // eslint-disable-next-line no-console
    console.log('[CATCHUP-AGENT] Logger obtained, plugin instance ready');
  }

  public setup(
    core: CoreSetup<CatchupAgentStartDependencies, CatchupAgentPluginStart>,
    plugins: CatchupAgentSetupDependencies
  ): CatchupAgentPluginSetup {
    this.logger.info('Setting up CatchupAgent plugin');
    this.workflowsManagement = plugins.workflowsManagement;

    try {
      // Check if OneChat plugin is available
      if (!plugins.onechat) {
        this.logger.error('OneChat plugin is not available! Cannot register tools and agents.');
        return {};
      }

      this.logger.info('OneChat plugin is available, proceeding with tool and agent registration');

      // Register all tools
      this.logger.info('Registering Security tools...');
      registerSecurityTools(plugins.onechat.tools, this.logger);
      this.logger.info('Security tools registered');

      // Observability and Search tools temporarily disabled - focusing on Security and External tools first
      // this.logger.info('Registering Observability tool...');
      // registerObservabilityTool(plugins.onechat.tools, this.logger);
      // this.logger.info('Observability tool registered');

      // Register unified search tool (works independently of search summary tool)
      this.logger.info('Registering Search tools...');
      registerSearchTool(plugins.onechat.tools, this.logger);
      this.logger.info('Search tools registered');

      this.logger.info('Registering External tools...');
      registerExternalTools(plugins.onechat.tools, this.logger);
      this.logger.info('External tools registered');

      this.logger.info('Registering Correlation tool...');
      registerCorrelationTool(plugins.onechat.tools, this.logger);
      this.logger.info('Correlation tool registered');

      this.logger.info('Registering Summary tool...');
      registerSummaryTool(plugins.onechat.tools, this.logger);
      this.logger.info('Summary tool registered');

      this.logger.info('Registering Prioritization tools...');
      registerPrioritizationTools(plugins.onechat.tools, this.logger);
      this.logger.info('Prioritization tools registered');

      this.logger.info('Registering Workflow-specific simplified tools...');
      registerWorkflowTools(plugins.onechat.tools, this.logger);
      this.logger.info('Workflow-specific simplified tools registered');

      // Register the main agent (must be last, after all tools are registered)
      this.logger.info('Registering CatchUp Agent...');
      if (!plugins.onechat.agents) {
        this.logger.error('OneChat agents setup is not available! Cannot register agent.');
        throw new Error('OneChat agents setup is not available');
      }
      registerCatchupAgent(plugins.onechat.agents, this.logger);
      this.logger.info('CatchUp Agent registration completed');

      this.logger.info('CatchupAgent plugin setup completed successfully');
    } catch (error) {
      this.logger.error(`Error during CatchupAgent plugin setup: ${error}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(error.stack);
      }
    }

    return {};
  }

  public start(core: CoreStart, plugins: CatchupAgentStartDependencies): CatchupAgentPluginStart {
    this.logger.info('Starting CatchupAgent plugin');
    const pluginStart = {
      getCasesClient: plugins.cases?.getCasesClientWithRequest,
      getRulesClient: plugins.alerting?.getRulesClientWithRequest,
      spaces: plugins.spaces,
      ruleRegistry: plugins.ruleRegistry,
      actions: plugins.actions,
    };
    // Store services for tools to access
    setPluginServices(core, pluginStart, this.config);

    // Register workflows if workflowsManagement is available
    // Use a fake system request for registration (to create/update workflow YAML)
    // At runtime, workflows will use real requests from Task Manager or manual execution
    if (this.workflowsManagement && plugins.spaces) {
      this.logger.info('Workflows Management plugin available. Registering workflows...');

      // Create a fake system request for workflow registration only
      // This is used to create/update the workflow YAML definition
      // At runtime, workflows will use real requests from Task Manager (with user context) or manual execution
      const fakeRawRequest: FakeRawRequest = {
        headers: {
          'kbn-system-request': 'true',
          'x-elastic-internal-origin': 'Kibana',
        },
        path: '/internal/workflows',
        auth: {
          isAuthenticated: true,
        },
      };
      const systemRequest = kibanaRequestFactory(fakeRawRequest);

      // Get default space ID
      const defaultSpaceId = DEFAULT_SPACE_ID;

      // Proactively create workflow execution index immediately to prevent "index_not_found_exception" errors
      // This is done as early as possible to ensure the index exists before workflowsManagement queries it
      // (which can happen when the UI loads workflows, not just during registration)
      // We don't await this to avoid blocking plugin startup, but we start it immediately
      this.initializeWorkflowIndices(core).catch((error) => {
        this.logger.warn(
          `Failed to initialize workflow execution index (non-critical, will be created lazily): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });

      // Register workflows asynchronously with a small delay to ensure service is initialized
      // Don't block plugin startup
      // Note: Scheduling may fail due to authentication, but the workflow YAML will still be registered
      // Workflows will work for manual execution, and scheduling will work once a user manually runs the workflow
      setTimeout(async () => {
        try {
          // Ensure index is ready before registering workflows
          // (It should already be created above, but we wait to be sure it's ready)
          await this.initializeWorkflowIndices(core);

          // Register workflows with fake request (for YAML registration only)
          // Runtime execution will use real requests from Task Manager or manual execution
          await registerCatchupWorkflows(
            this.workflowsManagement,
            this.logger,
            systemRequest,
            defaultSpaceId
          );
        } catch (error) {
          this.logger.error(`Failed to register workflows: ${error}`);
          if (error instanceof Error && error.stack) {
            this.logger.debug(`Workflow registration error stack: ${error.stack}`);
          }
        }
      }, 2000); // Wait 2 seconds for workflowsManagement service to initialize
    } else {
      if (!this.workflowsManagement) {
        this.logger.warn(
          'Workflows Management plugin not available. Workflows will not be registered.'
        );
      }
      if (!plugins.spaces) {
        this.logger.warn('Spaces plugin not available. Workflows will not be registered.');
      }
    }

    return pluginStart;
  }

  /**
   * Initialize workflow execution indices proactively to prevent "index_not_found_exception" errors
   * when workflowsManagement tries to fetch execution history for workflows that haven't been executed yet.
   * This follows the pattern used by other Kibana plugins that create indices on startup.
   *
   * We also wait for the index to be ready (green status) before returning to ensure it's available
   * for queries immediately after creation.
   */
  private async initializeWorkflowIndices(core: CoreStart): Promise<void> {
    const esClient = core.elasticsearch.client.asInternalUser;

    // Create both workflow execution indices - these are created lazily by repositories, but we create
    // them proactively to prevent errors when workflowsManagement queries for execution history
    const indicesToCreate = [
      {
        name: WORKFLOWS_EXECUTIONS_INDEX,
        mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      },
      {
        name: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
      },
    ];

    for (const { name, mappings } of indicesToCreate) {
      try {
        await this.createIndexWithMappings(esClient, name, mappings);

        // Wait for the index to be ready (green status) to ensure it's available for queries
        // This follows Kibana best practices for index initialization
        try {
          await esClient.cluster.health({
            index: name,
            wait_for_status: 'green',
            timeout: '30s',
          });
          this.logger.debug(`Workflow execution index ${name} is ready`);
        } catch (healthError) {
          // If health check fails, log but don't fail - the index might still be usable
          this.logger.debug(
            `Index health check for ${name} did not complete, but index may still be usable: ${
              healthError instanceof Error ? healthError.message : String(healthError)
            }`
          );
        }

        this.logger.debug(`Successfully initialized workflow execution index: ${name}`);
      } catch (indexError) {
        // If index already exists, that's fine - just log at debug level
        // This can happen if the index was created by another process or on a previous startup
        if (indexError?.meta?.body?.error?.type === 'resource_already_exists_exception') {
          this.logger.debug(`Workflow execution index ${name} already exists`);
          continue;
        }
        // Log error but continue with other indices
        this.logger.warn(
          `Failed to initialize workflow execution index ${name}: ${
            indexError instanceof Error ? indexError.message : String(indexError)
          }`
        );
      }
    }
  }

  /**
   * Create an Elasticsearch index with the specified mappings.
   * This is a local implementation following the same pattern as workflows-execution-engine.
   */
  private async createIndexWithMappings(
    esClient: ElasticsearchClient,
    indexName: string,
    mappings: typeof WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS
  ): Promise<void> {
    try {
      // Check if index already exists
      const indexExists = await esClient.indices.exists({
        index: indexName,
      });

      if (indexExists) {
        this.logger.debug(`Index ${indexName} already exists`);
        return;
      }

      this.logger.debug(`Creating index ${indexName} with mappings`);

      // Create the index with proper mappings
      await esClient.indices.create({
        index: indexName,
        mappings,
      });

      this.logger.info(`Successfully created index ${indexName}`);
    } catch (error) {
      // If the index already exists, we can ignore the error
      if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        this.logger.debug(`Index ${indexName} already exists (created by another process)`);
        return;
      }

      this.logger.error(`Failed to create index ${indexName}: ${error}`);
      throw error;
    }
  }

  public stop() {
    this.logger.info('Stopping CatchupAgent plugin');
  }
}
