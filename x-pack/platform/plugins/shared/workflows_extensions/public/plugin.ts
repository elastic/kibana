/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { PublicStepRegistry } from './step_registry';
import { registerInternalStepDefinitions } from './steps';
import { installTestBridge } from './test_bridge';
import { PublicTriggerRegistry } from './trigger_registry';
import { registerInternalTriggerDefinitions } from './triggers';
import type {
  WorkflowsExtensionsPublicPluginSetup,
  WorkflowsExtensionsPublicPluginSetupDeps,
  WorkflowsExtensionsPublicPluginStart,
  WorkflowsExtensionsPublicPluginStartDeps,
} from './types';
import type {
  WorkflowsExtensionsConfig,
  WorkflowsExtensionsExperimentalStepsConfig,
} from '../common/experimental_steps_config';
import { resolveExperimentalStepsConfig } from '../common/experimental_steps_config';

export class WorkflowsExtensionsPublicPlugin
  implements
    Plugin<
      WorkflowsExtensionsPublicPluginSetup,
      WorkflowsExtensionsPublicPluginStart,
      WorkflowsExtensionsPublicPluginSetupDeps,
      WorkflowsExtensionsPublicPluginStartDeps
    >
{
  private readonly stepRegistry: PublicStepRegistry;
  private readonly triggerRegistry: PublicTriggerRegistry;
  private readonly config: WorkflowsExtensionsConfig;
  private readonly experimentalStepsConfig: WorkflowsExtensionsExperimentalStepsConfig;
  private removeTestBridge?: () => void;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<WorkflowsExtensionsConfig>();
    this.experimentalStepsConfig = resolveExperimentalStepsConfig(this.config.experimentalSteps);
    this.stepRegistry = new PublicStepRegistry(initializerContext.logger.get());
    this.triggerRegistry = new PublicTriggerRegistry();
  }

  public setup(
    _core: CoreSetup,
    _plugins: WorkflowsExtensionsPublicPluginSetupDeps
  ): WorkflowsExtensionsPublicPluginSetup {
    registerInternalStepDefinitions(this.stepRegistry, {
      experimentalSteps: this.experimentalStepsConfig,
    });
    registerInternalTriggerDefinitions(this.triggerRegistry);

    return {
      registerStepDefinition: (definition) => this.stepRegistry.register(definition),
      registerTriggerDefinition: (definition) => this.triggerRegistry.register(definition),
    };
  }

  public start(
    _core: CoreStart,
    _plugins: WorkflowsExtensionsPublicPluginStartDeps
  ): WorkflowsExtensionsPublicPluginStart {
    this.removeTestBridge = installTestBridge(this.stepRegistry);

    return {
      getAllStepDefinitions: () => {
        return this.stepRegistry.getAll();
      },
      getStepDefinition: (stepTypeId: string) => {
        return this.stepRegistry.get(stepTypeId);
      },
      hasStepDefinition: (stepTypeId: string) => {
        return this.stepRegistry.has(stepTypeId);
      },
      getAllTriggerDefinitions: () => {
        return this.triggerRegistry.getAll();
      },
      getTriggerDefinition: (triggerId: string) => {
        return this.triggerRegistry.get(triggerId);
      },
      hasTriggerDefinition: (triggerId: string) => {
        return this.triggerRegistry.has(triggerId);
      },
      isReady: async () => {
        await Promise.all([this.stepRegistry.whenReady(), this.triggerRegistry.whenReady()]);
      },
    };
  }

  public stop() {
    this.removeTestBridge?.();
  }
}
