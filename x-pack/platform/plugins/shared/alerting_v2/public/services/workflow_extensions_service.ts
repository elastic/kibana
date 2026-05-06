/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';

export interface WorkflowExtensionsPublicServiceContract {
  registerPublicTriggerDefinitions(triggerDefinitions: PublicTriggerDefinition[]): void;
}

export class WorkflowExtensionsService implements WorkflowExtensionsPublicServiceContract {
  constructor(private readonly workflowsExtensions: WorkflowsExtensionsPublicPluginSetup) {}

  public registerPublicTriggerDefinitions(triggerDefinitions: PublicTriggerDefinition[]): void {
    triggerDefinitions.forEach((triggerDefinition) =>
      this.workflowsExtensions.registerTriggerDefinition(triggerDefinition)
    );
  }
}
