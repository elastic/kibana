/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
  ServerTriggerDefinition,
} from '@kbn/workflows-extensions/server';

type ServerStepDefinitionOrLoader = Parameters<
  WorkflowsExtensionsServerPluginSetup['registerStepDefinition']
>[0];

export interface WorkflowExtensionsServiceContract {
  /**
   * Registers all alerting-v2-owned workflow triggers and steps. Call once during
   * plugin setup (see bind_on_setup).
   */
  registerTriggerDefinitions(triggerDefinitions: ServerTriggerDefinition[]): void;
  registerStepDefinitions(stepDefintions: ServerStepDefinitionOrLoader[]): void;
  emitEvent(
    request: KibanaRequest,
    triggerId: string,
    payload: Record<string, unknown>
  ): Promise<void>;
}

export class WorkflowExtensionsService implements WorkflowExtensionsServiceContract {
  constructor(
    private readonly workflowsExtensionsSetup: WorkflowsExtensionsServerPluginSetup,
    private readonly getWorkflowsExtensionsStart: () => WorkflowsExtensionsServerPluginStart
  ) {}

  public registerStepDefinitions(stepDefintions: ServerStepDefinitionOrLoader[]): void {
    stepDefintions.forEach((stepDefinition) =>
      this.workflowsExtensionsSetup.registerStepDefinition(stepDefinition)
    );
  }

  public registerTriggerDefinitions(triggerDefinitions: ServerTriggerDefinition[]): void {
    triggerDefinitions.forEach((triggerDefinition) =>
      this.workflowsExtensionsSetup.registerTriggerDefinition(triggerDefinition)
    );
  }

  public async emitEvent(
    request: KibanaRequest,
    triggerId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const client = await this.getWorkflowsExtensionsStart().getClient(request);
    await client.emitEvent(triggerId, payload);
  }
}
