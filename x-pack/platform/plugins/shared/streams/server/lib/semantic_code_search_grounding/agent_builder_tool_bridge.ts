/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ToolsStart } from '@kbn/agent-builder-server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import { ToolResultType, type ToolResult } from '@kbn/agent-builder-common/tools/tool_result';

/**
 * Flat, LLM-friendly payload returned by every bridged tool callback. Mirrors
 * the shape the significant-events reasoning agent already consumes.
 */
export interface BridgedToolResponse {
  results: Array<{ type: string; data: unknown }>;
  count: number;
  error?: string;
  // Index signature so the response satisfies the inference `ToolResponse`
  // (a `Record<string, unknown>`) when returned from a typed callback.
  [key: string]: unknown;
}

/**
 * Maps Agent Builder tool results into a plain, LLM-friendly payload.
 * Error results are surfaced under `error`; everything else is passed through
 * as `{ type, data }` so the reasoning agent can read the workflow output.
 */
export const formatToolResults = (results: ToolResult[] | undefined): BridgedToolResponse => {
  const list = results ?? [];
  const errors = list
    .filter((result) => result.type === ToolResultType.error)
    .map((result) => (result.data as { message?: string })?.message ?? 'Unknown tool error');

  const data = list
    .filter((result) => result.type !== ToolResultType.error)
    .map((result) => ({ type: result.type, data: result.data }));

  return {
    results: data,
    count: data.length,
    ...(errors.length > 0 ? { error: errors.join('; ') } : {}),
  };
};

/**
 * Outcome of a tool's `prepare` hook: either extra params to merge into the
 * call, or an error response that short-circuits execution (e.g. when required
 * runtime state — like a selected code index — is missing).
 */
export type BridgePrepareOutcome =
  | { params?: Record<string, unknown> }
  | { error: BridgedToolResponse };

/**
 * Describes how to expose a single Agent Builder tool to the inference
 * reasoning agent. The tool's parameter schema is pulled from the Agent Builder
 * registry at runtime (never re-declared here); this spec only carries the
 * domain-specific concerns the registry can't know about.
 */
export interface BridgedToolSpec {
  /** Agent Builder tool id to delegate to, e.g. "scs.semantic_search". */
  sourceToolId: string;
  /** Name exposed to the reasoning agent, e.g. "code_search". */
  name: string;
  /**
   * Description override exposed to the LLM. When omitted, the Agent Builder
   * tool's own description is used.
   */
  description?: string;
  /**
   * Parameter names to hide from the LLM-facing schema and supply at runtime
   * via `prepare` (e.g. an `index` or `repository` injected from server state).
   * Hidden params are also dropped from the required list.
   */
  hiddenParams?: string[];
  /**
   * Per-call hook to inject params (e.g. the active index) or short-circuit
   * with an error response. Runs after required-argument validation.
   */
  prepare?: (args: Record<string, unknown>) => Promise<BridgePrepareOutcome> | BridgePrepareOutcome;
}

const missingArgResponse = (name: string): { response: BridgedToolResponse } => ({
  response: { results: [], count: 0, error: `"${name}" is required.` },
});

const isMissing = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

/**
 * Builds inference reasoning-agent tools (`ToolDefinition` + `ToolCallback`)
 * from registered Agent Builder tools, so we consume the existing tools instead
 * of re-implementing their schemas. For each spec the parameter schema is read
 * from the Agent Builder registry (`getSchema()` → JSON Schema), hidden params
 * are stripped, required args are validated generically, and the callback
 * delegates to `tools.execute`.
 *
 * Tools that can't be resolved (e.g. the backing workflow isn't installed) are
 * skipped so grounding degrades gracefully rather than failing construction.
 */
export const createInferenceToolsFromAgentBuilder = async ({
  tools,
  request,
  specs,
  logger,
}: {
  tools: ToolsStart;
  request: KibanaRequest;
  specs: BridgedToolSpec[];
  logger: Logger;
}): Promise<{ tools: Record<string, ToolDefinition>; callbacks: Record<string, ToolCallback> }> => {
  let registry: Awaited<ReturnType<ToolsStart['getRegistry']>>;
  try {
    registry = await tools.getRegistry({ request });
  } catch (error) {
    // The registry is unavailable (e.g. Agent Builder is in a bad state). Treat
    // grounding as unavailable rather than failing the caller.
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Unable to access the Agent Builder tool registry; skipping bridged tools: ${message}`
    );
    return { tools: {}, callbacks: {} };
  }

  const runTool = async (
    toolId: string,
    toolParams: Record<string, unknown>
  ): Promise<{ response: BridgedToolResponse }> => {
    const startTime = Date.now();
    try {
      const { results, prompt } = await tools.execute({ toolId, toolParams, request });
      if (!results && prompt) {
        return {
          response: {
            results: [],
            count: 0,
            error:
              'This tool requires confirmation and cannot be used during automated generation.',
          },
        };
      }
      logger.debug(`Agent Builder tool "${toolId}" completed in ${Date.now() - startTime}ms`);
      return { response: formatToolResults(results) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Agent Builder tool "${toolId}" failed after ${Date.now() - startTime}ms: ${message}`
      );
      return { response: { results: [], count: 0, error: message } };
    }
  };

  const toolDefinitions: Record<string, ToolDefinition> = {};
  const callbacks: Record<string, ToolCallback> = {};

  for (const spec of specs) {
    let description: string;
    let properties: Record<string, unknown>;
    let required: string[];

    try {
      const tool = await registry.get(spec.sourceToolId);
      const zodSchema = await tool.getSchema();
      const { $schema, ...jsonSchema } = z.toJSONSchema(zodSchema, {
        unrepresentable: 'any',
        io: 'input',
      }) as { $schema?: string; properties?: Record<string, unknown>; required?: string[] };

      const hidden = new Set(spec.hiddenParams ?? []);
      properties = Object.fromEntries(
        Object.entries(jsonSchema.properties ?? {}).filter(([name]) => !hidden.has(name))
      );
      required = (jsonSchema.required ?? []).filter((name) => !hidden.has(name));
      description = spec.description ?? tool.description;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(
        `Skipping Agent Builder tool "${spec.sourceToolId}" (unavailable or no schema): ${message}`
      );
      continue;
    }

    toolDefinitions[spec.name] = {
      description,
      schema: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    } as ToolDefinition;

    callbacks[spec.name] = async (toolCall) => {
      const args = (toolCall.function.arguments ?? {}) as Record<string, unknown>;

      for (const name of required) {
        if (isMissing(args[name])) {
          return missingArgResponse(name);
        }
      }

      let injected: Record<string, unknown> = {};
      if (spec.prepare) {
        const outcome = await spec.prepare(args);
        if ('error' in outcome) {
          return { response: outcome.error };
        }
        injected = outcome.params ?? {};
      }

      return runTool(spec.sourceToolId, { ...args, ...injected });
    };
  }

  return { tools: toolDefinitions, callbacks };
};
