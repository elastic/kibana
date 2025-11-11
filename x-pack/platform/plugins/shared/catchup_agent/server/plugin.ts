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
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { FakeRawRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type {
  CatchupAgentPluginSetup,
  CatchupAgentPluginStart,
  CatchupAgentSetupDependencies,
  CatchupAgentStartDependencies,
} from './types';
import type { CatchupAgentConfigType } from './config';
import { registerSecurityTools } from './tools/security/register_tools';
import { registerObservabilityTool } from './tools/observability/register_tools';
// Temporarily disabled - focusing on Security and External tools first
// import { registerSearchTool } from './tools/search/register_tools';
import { registerExternalTools } from './tools/external/register_tools';
import { registerCorrelationTool } from './tools/correlation/register_tools';
import { registerSummaryTool } from './tools/summary/register_tools';
import { registerPrioritizationTools } from './tools/prioritization/register_tools';
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

    // Store workflowsManagement for later use in start
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

      this.logger.info('Registering Observability tool...');
      registerObservabilityTool(plugins.onechat.tools, this.logger);
      this.logger.info('Observability tool registered');

      // Search tool temporarily disabled - focusing on Security, Observability and External tools first
      // this.logger.info('Registering Search tool...');
      // registerSearchTool(plugins.onechat.tools, this.logger);
      // this.logger.info('Search tool registered');

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

      this.logger.info('Registering Workflow tools...');
      registerWorkflowTools(plugins.onechat.tools, this.logger);
      this.logger.info('Workflow tools registered');

      // Register the main agent
      this.logger.info('Registering CatchUp Agent...');
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

    // Register workflows if workflowsManagement is available (fire-and-forget)
    if (this.workflowsManagement) {
      // Create a fake request for workflow registration
      const fakeRawRequest: FakeRawRequest = {
        headers: {},
        path: '/',
      };
      const fakeRequest = kibanaRequestFactory(fakeRawRequest);

      // Register workflows in the default space (async, fire-and-forget)
      registerCatchupWorkflows(
        this.workflowsManagement,
        this.logger,
        fakeRequest,
        DEFAULT_SPACE_ID
      ).catch((error) => {
        this.logger.error(`Error registering workflows: ${error}`);
        if (error instanceof Error && error.stack) {
          this.logger.error(error.stack);
        }
      });
    } else {
      this.logger.warn(
        'Workflows Management plugin not available. Workflows will not be registered automatically.'
      );
    }

    return pluginStart;
  }

  public stop() {
    this.logger.info('Stopping CatchupAgent plugin');
  }
}
