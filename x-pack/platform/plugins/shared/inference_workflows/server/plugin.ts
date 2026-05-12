/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import {
  BEFORE_PROMPT_SEND_TRIGGER_ID,
  AFTER_COMPLETION_TRIGGER_ID,
  beforePromptSendEventSchema,
  afterCompletionEventSchema,
} from '@kbn/workflows-extensions/common';
import {
  defaultBeforePromptSendHandler,
  defaultAfterCompletionHandler,
} from './anonymization/default_handlers';
import {
  aiClassifyStepDefinition,
  aiPromptStepDefinition,
  aiSummarizeStepDefinition,
} from './steps/ai';
import { createAiPiiStepDefinition, createTransformPiiRestoreStepDefinition } from './steps/pii';
import type {
  InferenceWorkflowsServerSetup,
  InferenceWorkflowsServerSetupDeps,
  InferenceWorkflowsServerStart,
  InferenceWorkflowsServerStartDeps,
} from './types';

const messageSchema = z.object({ role: z.string(), content: z.string().optional() }).passthrough();
const messagesSchema = z.array(messageSchema);

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
      id: BEFORE_PROMPT_SEND_TRIGGER_ID,
      eventSchema: beforePromptSendEventSchema,
      sync: {
        outputSchema: z
          .object({ system: z.string().optional(), messages: messagesSchema })
          .passthrough(),
        maxTimeout: '15s',
        failurePolicy: 'closed',
        chained: true,
      },
    });
    workflowsExtensions.registerTriggerDefinition({
      id: AFTER_COMPLETION_TRIGGER_ID,
      eventSchema: afterCompletionEventSchema,
      sync: {
        outputSchema: z.object({ response: z.string() }).passthrough(),
        maxTimeout: '15s',
        failurePolicy: 'closed',
        chained: true,
      },
    });

    // Register default anonymization hook handlers
    workflowsExtensions.registerHookHandler(
      BEFORE_PROMPT_SEND_TRIGGER_ID,
      defaultBeforePromptSendHandler
    );
    workflowsExtensions.registerHookHandler(
      AFTER_COMPLETION_TRIGGER_ID,
      defaultAfterCompletionHandler
    );

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

    return {};
  }

  start(
    _core: CoreStart,
    plugins: InferenceWorkflowsServerStartDeps
  ): InferenceWorkflowsServerStart {
    this.workflowsExtStart = plugins.workflowsExtensions;
    return {};
  }
}
