/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { tool } from '@langchain/core/tools';
import type { StructuredToolInterface } from '@langchain/core/tools';

export const TOOL_NAMES = {
  setYaml: 'set_yaml',
  insertStep: 'insert_step',
  modifyStep: 'modify_step',
  modifyStepProperty: 'modify_step_property',
  deleteStep: 'delete_step',
  getStepDefinitions: 'get_step_definitions',
  getTriggerDefinitions: 'get_trigger_definitions',
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

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

export const setYamlSchema = z.object({
  yaml: z.string().describe('Complete workflow YAML content'),
});

export const insertStepSchema = z.object({
  step: stepDefinitionSchema.describe('Step definition to insert'),
  insertAfterStep: z
    .string()
    .optional()
    .describe('Name of an existing step to insert after; appends to root steps if omitted'),
});

export const modifyStepSchema = z.object({
  stepName: z.string(),
  updatedStep: stepDefinitionSchema,
});

export const modifyStepPropertySchema = z.object({
  stepName: z.string(),
  property: z.string().describe('Property key (e.g. "with.message", "type")'),
  value: z.unknown(),
});

export const deleteStepSchema = z.object({
  stepName: z.string(),
});

export const getStepDefinitionsSchema = z.object({
  stepType: z
    .string()
    .optional()
    .describe('Exact step type id to fetch the full schema for'),
  search: z.string().optional().describe('Keyword to filter step types'),
});

export const getTriggerDefinitionsSchema = z.object({
  triggerType: z.string().optional(),
});

const NEVER_CALLED = (): never => {
  throw new Error(
    'Bound workflow tools are not directly invocable. Dispatch happens inside the graph node.'
  );
};

export const buildBoundTools = (): StructuredToolInterface[] => [
  tool(NEVER_CALLED, {
    name: TOOL_NAMES.setYaml,
    description: 'Replace the entire workflow YAML with a new version',
    schema: setYamlSchema,
  }),
  tool(NEVER_CALLED, {
    name: TOOL_NAMES.insertStep,
    description: 'Insert a new step into the workflow',
    schema: insertStepSchema,
  }),
  tool(NEVER_CALLED, {
    name: TOOL_NAMES.modifyStep,
    description: 'Replace an existing step by name',
    schema: modifyStepSchema,
  }),
  tool(NEVER_CALLED, {
    name: TOOL_NAMES.modifyStepProperty,
    description: 'Modify a single property of an existing step',
    schema: modifyStepPropertySchema,
  }),
  tool(NEVER_CALLED, {
    name: TOOL_NAMES.deleteStep,
    description: 'Delete a step by name',
    schema: deleteStepSchema,
  }),
  tool(NEVER_CALLED, {
    name: TOOL_NAMES.getStepDefinitions,
    description:
      'Fetch the full schema for one or more step types (input/config params, examples)',
    schema: getStepDefinitionsSchema,
  }),
  tool(NEVER_CALLED, {
    name: TOOL_NAMES.getTriggerDefinitions,
    description: 'Fetch the full schema for one or more trigger types',
    schema: getTriggerDefinitionsSchema,
  }),
];
