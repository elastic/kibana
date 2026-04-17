/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { ServerStepDefinition, StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';

/**
 * Adapts a Cases ServerStepDefinition into an agent builder BuiltinToolDefinition.
 *
 * The mapping:
 * - `stepDef.inputSchema`        → tool `schema`
 * - `stepDef.label/description`  → tool `description`
 * - `stepDef.handler`            → tool `handler` (bridged via a minimal StepHandlerContext stub)
 *
 * Workflow-only config fields (e.g. `push-case`) are never surfaced to agent builder.
 * Config fields listed in `agentToolConfigFields` are promoted to the tool's input schema
 * so the LLM can supply them directly (e.g. `connector-id` for createCase).
 */
export function createAgentToolFromCasesStep(
  toolId: string,
  stepDef: ServerStepDefinition,
  agentToolConfigFields?: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): BuiltinToolDefinition<z.ZodObject<any>> {
  // Build the tool input schema.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputSchema = stepDef.inputSchema as z.ZodObject<any>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schema: z.ZodObject<any> = inputSchema;
  if (agentToolConfigFields?.length && stepDef.configSchema) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configSchema = stepDef.configSchema as z.ZodObject<any>;
    // Pick only the promoted keys from the config schema, then merge into the input schema
    // so the agent can supply them as regular tool parameters.
    const pickedConfig = configSchema.pick(
      Object.fromEntries(agentToolConfigFields.map((k) => [k, true])) as Record<string, true>
    );
    schema = inputSchema.merge(pickedConfig);
  }

  const configFieldSet = new Set(agentToolConfigFields ?? []);

  return {
    id: toolId,
    type: ToolType.builtin,
    description: [stepDef.label, stepDef.description].filter(Boolean).join('\n\n'),
    schema,
    tags: ['cases'],
    handler: async (args, toolContext) => {
      // Split tool args into step input (regular params) and config (promoted config fields).
      const input: Record<string, unknown> = {};
      // Explicitly disable push-case so the workflow-push side-effect never fires from an
      // agent builder invocation. Other config fields default to absent (undefined).
      const config: Record<string, unknown> = { 'push-case': false };

      for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
        if (configFieldSet.has(key)) {
          config[key] = value;
        } else {
          input[key] = value;
        }
      }

      // Build a minimal StepHandlerContext stub.
      // Cases step handlers only access:
      //   contextManager.getFakeRequest() — to obtain the CasesClient
      //   context.input / context.config   — for the step's business logic
      //   context.logger                   — for scoped logging
      // The remaining ContextManager methods are not called by any Cases step handler.
      // ContextManager is not re-exported from @kbn/workflows-extensions/server, so we
      // construct a compatible object and let the outer `as StepHandlerContext` assertion cover it.
      const fakeContextManager = {
        getFakeRequest: () => toolContext.request,
        getContext: () => {
          throw new Error('getContext is not available in the agent builder execution context');
        },
        getScopedEsClient: () => {
          throw new Error(
            'getScopedEsClient is not available in the agent builder execution context'
          );
        },
        renderInputTemplate: <T>(v: T) => v,
      };

      const fakeStepCtx = {
        input,
        config,
        rawInput: input,
        contextManager: fakeContextManager,
        logger: toolContext.logger,
        abortSignal: new AbortController().signal,
        stepId: stepDef.id,
        stepType: stepDef.id,
      } as StepHandlerContext;

      const result = await stepDef.handler(fakeStepCtx);

      if (result.error) {
        throw result.error;
      }

      return {
        results: [{ type: 'other' as const, data: result.output ?? {} }],
      };
    },
  };
}
