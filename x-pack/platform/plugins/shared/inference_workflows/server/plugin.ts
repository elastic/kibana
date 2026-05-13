/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { aroundCompletionAnonymizationWorkflow } from '@kbn/default-anonymization-workflows';
import {
  BEFORE_COMPLETION_TRIGGER_ID,
  AFTER_COMPLETION_TRIGGER_ID,
  AROUND_COMPLETION_TRIGGER_ID,
  beforeCompletionEventSchema,
  afterCompletionEventSchema,
  aroundCompletionEventSchema,
} from '@kbn/workflows-extensions/common';
import {
  aiClassifyStepDefinition,
  aiPromptStepDefinition,
  aiSummarizeStepDefinition,
} from './steps/ai';
import { createAiPiiStepDefinition, createTransformPiiRestoreStepDefinition } from './steps/pii';
import { callSiteProceedStepDefinition } from './steps/call_site';
import type {
  InferenceWorkflowsServerSetup,
  InferenceWorkflowsServerSetupDeps,
  InferenceWorkflowsServerStart,
  InferenceWorkflowsServerStartDeps,
} from './types';

export class InferenceWorkflowsServerPlugin
  implements
    Plugin<
      InferenceWorkflowsServerSetup,
      InferenceWorkflowsServerStart,
      InferenceWorkflowsServerSetupDeps,
      InferenceWorkflowsServerStartDeps
    >
{
  /**
   * Holds the workflowsExtensions start contract.
   * Populated in start(); read by PII step closures registered in setup().
   * Safe because all request handling happens after start() completes.
   */
  private workflowsExtStart:
    | { getSessionCapabilities: (s: string) => Record<string, unknown> | undefined }
    | undefined = undefined;

  constructor(_initializerContext: PluginInitializerContext) {}

  setup(
    core: CoreSetup<InferenceWorkflowsServerStartDeps>,
    plugins: InferenceWorkflowsServerSetupDeps
  ): InferenceWorkflowsServerSetup {
    const { workflowsExtensions } = plugins;

    // Register inference lifecycle trigger definitions
    workflowsExtensions.registerTriggerDefinition({
      id: BEFORE_COMPLETION_TRIGGER_ID,
      eventSchema: beforeCompletionEventSchema,
      sync: {
        maxTimeout: '15s',
        failurePolicy: 'closed',
        chained: true,
        inlineExecution: true,
      },
    });
    workflowsExtensions.registerTriggerDefinition({
      id: AFTER_COMPLETION_TRIGGER_ID,
      eventSchema: afterCompletionEventSchema,
      sync: {
        maxTimeout: '15s',
        failurePolicy: 'closed',
        chained: true,
        inlineExecution: true,
      },
    });
    workflowsExtensions.registerTriggerDefinition({
      id: AROUND_COMPLETION_TRIGGER_ID,
      eventSchema: aroundCompletionEventSchema,
      sync: {
        maxTimeout: '30s',
        failurePolicy: 'closed',
        chained: false,
        inlineExecution: true,
      },
    });

    // Register AI steps (require inference at start time via coreSetup.getStartServices())
    workflowsExtensions.registerStepDefinition(aiClassifyStepDefinition(core));
    workflowsExtensions.registerStepDefinition(aiPromptStepDefinition(core));
    workflowsExtensions.registerStepDefinition(aiSummarizeStepDefinition(core));

    // Register PII steps with a lazy capability lookup.
    // The closure reads from this.workflowsExtStart which is set in start().
    // All request handling is guaranteed to happen after start() completes.
    const getCapabilities = (sessionId: string): Record<string, unknown> | undefined =>
      this.workflowsExtStart?.getSessionCapabilities(sessionId);

    workflowsExtensions.registerStepDefinition(createAiPiiStepDefinition(getCapabilities));
    workflowsExtensions.registerStepDefinition(
      createTransformPiiRestoreStepDefinition(getCapabilities)
    );
    workflowsExtensions.registerStepDefinition(callSiteProceedStepDefinition);

    return {};
  }

  start(
    _core: CoreStart,
    plugins: InferenceWorkflowsServerStartDeps
  ): InferenceWorkflowsServerStart {
    this.workflowsExtStart = plugins.workflowsExtensions;
    return {
      getDefaultWorkflows: () => [
        {
          id: 'default-pii-anonymization-around-completion',
          yaml: aroundCompletionAnonymizationWorkflow,
        },
      ],
    };
  }
}
