/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { tool } from '@langchain/core/tools';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { ToolCall } from '@kbn/agent-builder-genai-utils/langchain';
import {
  insertStep,
  modifyStep,
  modifyStepProperty,
  deleteStep,
  type StepDefinition,
} from '@kbn/workflows-yaml';
import { lookupStepDefinitions, lookupTriggerDefinitions, type LookupDeps } from './lookup';

/* ---------- Public types ---------- */

export interface ToolMessage {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface DispatchResult {
  /** New YAML if the tool mutated state; undefined otherwise. */
  yaml?: string;
  message: ToolMessage;
}

export interface ToolExecutionContext {
  state: { yaml: string };
  deps: LookupDeps;
}

/**
 * One self-contained tool definition: its name, the LLM-facing description,
 * the input schema, the edit/lookup classification, and the real handler.
 *
 * The graph's tools node calls `execute` directly. The langchain wrapping
 * (`buildBoundTools`) only uses name + description + schema so the model
 * can produce well-typed tool calls; its tool body is intentionally never
 * invoked (see `NEVER_CALLED`).
 */
export interface WorkflowGenToolDefinition<TSchema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: TSchema;
  /** True when execution produces a new YAML state; false for read-only lookups. */
  mutatesYaml: boolean;
  execute: (args: z.infer<TSchema>, context: ToolExecutionContext) => Promise<DispatchResult>;
}

/**
 * Identity helper that infers `TSchema` from the literal definition. Letting
 * each tool be typed via the generic (rather than the wide `WorkflowGenToolDefinition`)
 * means `execute`'s `args` parameter is narrowed to the schema's inferred shape
 * rather than `unknown`.
 */
const defineTool = <TSchema extends z.ZodType>(
  def: WorkflowGenToolDefinition<TSchema>
): WorkflowGenToolDefinition<TSchema> => def;

/* ---------- Shared sub-schemas ---------- */

const stepDefinitionSchema = z
  .object({
    name: z.string(),
    type: z.string(),
    'connector-id': z.string().optional(),
    if: z.string().optional(),
    with: z.record(z.string(), z.unknown()).optional(),
    steps: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

/* ---------- Tool definitions ---------- */

const setYamlTool = defineTool({
  name: 'set_yaml',
  description: 'Replace the entire workflow YAML with a new version',
  schema: z.object({
    yaml: z.string().describe('Complete workflow YAML content'),
  }),
  mutatesYaml: true,
  execute: async ({ yaml }) => ({
    yaml,
    message: { success: true, data: { length: yaml.length } },
  }),
});

const insertStepTool = defineTool({
  name: 'insert_step',
  description: 'Insert a new step into the workflow',
  schema: z.object({
    step: stepDefinitionSchema.describe('Step definition to insert'),
    insertAfterStep: z
      .string()
      .optional()
      .describe('Name of an existing step to insert after; appends to root steps if omitted'),
  }),
  mutatesYaml: true,
  execute: async ({ step, insertAfterStep }, { state }) => {
    const result = insertStep(state.yaml, step as StepDefinition, insertAfterStep);
    return result.success
      ? { yaml: result.yaml, message: { success: true } }
      : { message: { success: false, error: result.error } };
  },
});

const modifyStepTool = defineTool({
  name: 'modify_step',
  description: 'Replace an existing step by name',
  schema: z.object({
    stepName: z.string(),
    updatedStep: stepDefinitionSchema,
  }),
  mutatesYaml: true,
  execute: async ({ stepName, updatedStep }, { state }) => {
    const result = modifyStep(state.yaml, stepName, updatedStep as StepDefinition);
    return result.success
      ? { yaml: result.yaml, message: { success: true } }
      : { message: { success: false, error: result.error } };
  },
});

const modifyStepPropertyTool = defineTool({
  name: 'modify_step_property',
  description: 'Modify a single property of an existing step',
  schema: z.object({
    stepName: z.string(),
    property: z.string().describe('Property key (e.g. "with.message", "type")'),
    value: z.unknown(),
  }),
  mutatesYaml: true,
  execute: async ({ stepName, property, value }, { state }) => {
    const result = modifyStepProperty(state.yaml, stepName, property, value);
    return result.success
      ? { yaml: result.yaml, message: { success: true } }
      : { message: { success: false, error: result.error } };
  },
});

const deleteStepTool = defineTool({
  name: 'delete_step',
  description: 'Delete a step by name',
  schema: z.object({
    stepName: z.string(),
  }),
  mutatesYaml: true,
  execute: async ({ stepName }, { state }) => {
    const result = deleteStep(state.yaml, stepName);
    return result.success
      ? { yaml: result.yaml, message: { success: true } }
      : { message: { success: false, error: result.error } };
  },
});

const getStepDefinitionsTool = defineTool({
  name: 'get_step_definitions',
  description: 'Fetch the full schema for one or more step types (input/config params, examples)',
  schema: z.object({
    stepType: z.string().optional().describe('Exact step type id to fetch the full schema for'),
    search: z.string().optional().describe('Keyword to filter step types'),
  }),
  mutatesYaml: false,
  execute: async (args, { deps }) => ({
    message: { success: true, data: await lookupStepDefinitions(args, deps) },
  }),
});

const getTriggerDefinitionsTool = defineTool({
  name: 'get_trigger_definitions',
  description: 'Fetch the full schema for one or more trigger types',
  schema: z.object({
    triggerType: z.string().optional(),
  }),
  mutatesYaml: false,
  execute: async (args) => ({
    message: { success: true, data: await lookupTriggerDefinitions(args) },
  }),
});

/* ---------- Registry ---------- */

export const workflowGenTools: ReadonlyArray<WorkflowGenToolDefinition> = [
  setYamlTool,
  insertStepTool,
  modifyStepTool,
  modifyStepPropertyTool,
  deleteStepTool,
  getStepDefinitionsTool,
  getTriggerDefinitionsTool,
];

const toolByName: ReadonlyMap<string, WorkflowGenToolDefinition> = new Map(
  workflowGenTools.map((t) => [t.name, t])
);

/* ---------- Derived helpers ---------- */

export const isEditToolName = (name: string): boolean => toolByName.get(name)?.mutatesYaml === true;

const NEVER_CALLED = (): never => {
  throw new Error(
    'Bound workflow tools are not directly invocable. Dispatch happens inside the graph node.'
  );
};

/**
 * Builds the langchain `StructuredTool[]` array used for `model.bindTools()`.
 * The tool bodies are stubs — actual execution goes through `dispatchToolCall`,
 * which has access to the dependencies (api, request, spaceId) that langchain
 * doesn't.
 */
export const buildBoundTools = (): StructuredToolInterface[] =>
  workflowGenTools.map((t) =>
    tool(NEVER_CALLED, {
      name: t.name,
      description: t.description,
      schema: t.schema,
    })
  );

export const dispatchToolCall = async (
  state: { yaml: string },
  call: ToolCall,
  deps: LookupDeps
): Promise<DispatchResult> => {
  const definition = toolByName.get(call.toolName);
  if (!definition) {
    return { message: { success: false, error: `Unknown tool: ${call.toolName}` } };
  }
  const parsed = definition.schema.safeParse(call.args);
  if (!parsed.success) {
    return {
      message: {
        success: false,
        error: `Invalid arguments for ${call.toolName}: ${parsed.error.message}`,
      },
    };
  }
  return definition.execute(parsed.data, { state, deps });
};
