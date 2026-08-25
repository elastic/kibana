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
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { NightshiftInvestigationsClient } from './client/investigations_client';
import { NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER } from './lib/managed_workflows/constants';
import { installInvestigationWorkflow } from './lib/managed_workflows/install_investigation_workflow';
import { nightshiftInvestigationsRouteRepository } from './routes';
import { triggerInvestigationStepDefinition } from './step_definitions/trigger_investigation';
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
  private spaces?: NightshiftInvestigationsStartDeps['spaces'];

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
  }

  setup(
    core: CoreSetup<NightshiftInvestigationsStartDeps, NightshiftInvestigationsServerStart>,
    plugins: NightshiftInvestigationsSetupDeps
  ): NightshiftInvestigationsServerSetup {
    this.workflowsManagement = plugins.workflowsManagement;

    const getInvestigationsClient = (request: KibanaRequest, spaceId?: string) =>
      new NightshiftInvestigationsClient(
        request,
        this.workflowsManagement,
        this.spaces,
        this.logger,
        spaceId
      );

    plugins.workflowsExtensions?.registerManagedWorkflowOwner(
      NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER
    );

    if (plugins.workflowsManagement) {
      if (plugins.workflowsExtensions) {
        plugins.workflowsExtensions.registerStepDefinition(
          triggerInvestigationStepDefinition(getInvestigationsClient)
        );
      }

      registerRoutes({
        repository: nightshiftInvestigationsRouteRepository,
        dependencies: { getInvestigationsClient },
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

    if (plugins.workflowsExtensions) {
      this.installManagedWorkflows(plugins.workflowsExtensions).catch((err) => {
        this.logger.error(
          `Failed to install nightshift investigations managed workflows: ${err.message}`
        );
      });
    }

    return {
      getInvestigationsClient: (request) =>
        new NightshiftInvestigationsClient(
          request,
          this.workflowsManagement,
          this.spaces,
          this.logger
        ),
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
