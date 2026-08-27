/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { NightshiftInvestigationsClient } from './client/investigations_client';
import { NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER } from './lib/managed_workflows/constants';
import { installInvestigationWorkflow } from './lib/managed_workflows/install_investigation_workflow';
import { installInvestigationAgent } from './lib/install_investigation_agent';
import { nightshiftInvestigationsRouteRepository } from './routes';
import { triggerInvestigationStepDefinition } from './step_definitions/trigger_investigation';
import { createTriggerEmitter, type TriggerEmitter } from './workflows/triggers/emit';
import { registerInvestigationsWorkflowTriggers } from './workflows/triggers/register_triggers';
import { registerInvestigationAgentType } from './agents/investigation';
import { createInvestigationProgressReportTool } from './tools/investigation_progress_report/tool';
import type {
  NightshiftInvestigationsServerSetup,
  NightshiftInvestigationsServerStart,
  NightshiftInvestigationsSetupDeps,
  NightshiftInvestigationsStartDeps,
} from './types';

export class NightshiftInvestigationsPlugin
  implements
    Plugin<
      NightshiftInvestigationsServerSetup,
      NightshiftInvestigationsServerStart,
      NightshiftInvestigationsSetupDeps,
      NightshiftInvestigationsStartDeps
    >
{
  private readonly logger: Logger;
  private workflowsManagement?: NightshiftInvestigationsSetupDeps['workflowsManagement'];
  private workflowsExtensionsStart?: NightshiftInvestigationsStartDeps['workflowsExtensions'];
  private spaces?: NightshiftInvestigationsStartDeps['spaces'];
  private agentBuilder?: NightshiftInvestigationsStartDeps['agentBuilder'];

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
  }

  setup(
    core: CoreSetup<NightshiftInvestigationsStartDeps, NightshiftInvestigationsServerStart>,
    plugins: NightshiftInvestigationsSetupDeps
  ): NightshiftInvestigationsServerSetup {
    // Core gates the plugin on xpack.nightshift_investigations.enabled.
    this.workflowsManagement = plugins.workflowsManagement;
    registerInvestigationsWorkflowTriggers(plugins.workflowsExtensions);

    const getTriggerEmitter = (request: KibanaRequest): TriggerEmitter | undefined =>
      createTriggerEmitter({
        workflowsExtensions: this.workflowsExtensionsStart,
        request,
        logger: this.logger,
      });

    const getInvestigationsClient = (request: KibanaRequest, spaceId?: string) =>
      new NightshiftInvestigationsClient({
        request,
        workflowsManagement: this.workflowsManagement,
        spaces: this.spaces,
        logger: this.logger,
        spaceIdOverride: spaceId,
        agentBuilder: this.agentBuilder,
      });

    plugins.workflowsExtensions?.registerManagedWorkflowOwner(
      NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER
    );

    if (plugins.agentBuilder) {
      registerInvestigationAgentType(plugins.agentBuilder);
      plugins.agentBuilder.tools.register(
        createInvestigationProgressReportTool({
          logger: this.logger.get('investigation_progress_report_tool'),
        })
      );
    }

    if (plugins.workflowsManagement) {
      if (plugins.workflowsExtensions) {
        plugins.workflowsExtensions.registerStepDefinition(
          triggerInvestigationStepDefinition(getInvestigationsClient)
        );
      }

      registerRoutes({
        repository: nightshiftInvestigationsRouteRepository,
        dependencies: { getInvestigationsClient, getTriggerEmitter },
        core,
        logger: this.logger,
        runDevModeChecks: false,
      });
    } else {
      this.logger.warn(
        'workflowsManagement is not available — nightshift investigations routes will not be registered'
      );
    }
  }

  start(
    _core: CoreStart,
    plugins: NightshiftInvestigationsStartDeps
  ): NightshiftInvestigationsServerStart {
    this.spaces = plugins.spaces;
    this.workflowsExtensionsStart = plugins.workflowsExtensions;
    this.agentBuilder = plugins.agentBuilder;

    if (plugins.agentBuilder) {
      void installInvestigationAgent({
        agentBuilder: plugins.agentBuilder,
        spaceId: DEFAULT_SPACE_ID,
      }).catch((err) => {
        this.logger.error(`Failed to install investigation agent in default space: ${err.message}`);
      });
    }

    if (plugins.workflowsExtensions) {
      this.installManagedWorkflows(plugins.workflowsExtensions).catch((err) => {
        this.logger.error(
          `Failed to install nightshift investigations managed workflows: ${err.message}`
        );
      });
    }

    return {
      getInvestigationsClient: (request) =>
        new NightshiftInvestigationsClient({
          request,
          workflowsManagement: this.workflowsManagement,
          spaces: this.spaces,
          logger: this.logger,
          agentBuilder: this.agentBuilder,
        }),
    };
  }

  /**
   * Installs the static managed workflows this plugin owns and signals readiness so the
   * platform can reconcile (prune orphans / apply upgrades) for this plugin's workflows.
   */
  private async installManagedWorkflows(
    workflowsExtensions: WorkflowsExtensionsServerPluginStart
  ): Promise<void> {
    const client = await workflowsExtensions.initManagedWorkflowsClient(
      NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER
    );
    await installInvestigationWorkflow({ client });
    await client.ready();
  }
}
