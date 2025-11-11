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
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<CatchupAgentConfigType>();
  }

  public setup(
    core: CoreSetup<CatchupAgentStartDependencies, CatchupAgentPluginStart>,
    plugins: CatchupAgentSetupDependencies
  ): CatchupAgentPluginSetup {
    // Store workflowsManagement for later use in start
    this.workflowsManagement = plugins.workflowsManagement;

    try {
      // Check if OneChat plugin is available
      if (!plugins.onechat) {
        this.logger.error('OneChat plugin is not available! Cannot register tools and agents.');
        return {};
      }

      // Register all tools
      registerSecurityTools(plugins.onechat.tools, this.logger);
      registerObservabilityTool(plugins.onechat.tools, this.logger);
      registerExternalTools(plugins.onechat.tools, this.logger);
      registerCorrelationTool(plugins.onechat.tools, this.logger);
      registerSummaryTool(plugins.onechat.tools, this.logger);
      registerPrioritizationTools(plugins.onechat.tools, this.logger);
      registerWorkflowTools(plugins.onechat.tools, this.logger);

      // Register the main agent
      registerCatchupAgent(plugins.onechat.agents, this.logger);
    } catch (error) {
      this.logger.error(`Error during CatchupAgent plugin setup: ${error}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(error.stack);
      }
    }

    return {};
  }

  public start(core: CoreStart, plugins: CatchupAgentStartDependencies): CatchupAgentPluginStart {
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
    // Plugin stopped
  }
}
