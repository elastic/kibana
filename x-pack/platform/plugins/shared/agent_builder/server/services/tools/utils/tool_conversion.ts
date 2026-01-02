/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonSchema7ObjectType } from 'zod-to-json-schema';
import zodToJsonSchema from 'zod-to-json-schema';
import type { ZodObject } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDefinitionWithSchema, ToolDefinition, ToolType } from '@kbn/agent-builder-common';
import type { Runner, ExecutableTool, InternalToolDefinition } from '@kbn/agent-builder-server';

export const toExecutableTool = <
  TConfig extends object = {},
  RunInput extends ZodObject<any> = ZodObject<any>
>({
  tool,
  runner,
  request,
  asInternal = false,
}: {
  tool: InternalToolDefinition<ToolType, TConfig, RunInput>;
  runner: Runner;
  request: KibanaRequest;
  asInternal?: boolean;
}): ExecutableTool<TConfig, RunInput> => {
  const { getHandler, ...toolParts } = tool;

  return {
    ...toolParts,
    execute: (params) => {
      if (asInternal) {
        return runner.runInternalTool({ ...params, tool, request });
      } else {
        return runner.runTool({ ...params, toolId: tool.id, request });
      }
    },
  };
};

/**
 * Remove all additional properties from a tool descriptor.
 *
 * Can be used to convert/clean tool registration for public-facing APIs.
 */
export const toDescriptorWithSchema = async (
  tool: InternalToolDefinition
): Promise<ToolDefinitionWithSchema> => {
  const descriptor = toDescriptor(tool);
  const schema = await tool.getSchema();
  const jsonSchema = zodToJsonSchema(schema) as JsonSchema7ObjectType;
  return { ...descriptor, schema: jsonSchema };
};

export const toDescriptor = (tool: InternalToolDefinition): ToolDefinition => {
  const { id, type, description, tags, configuration, readonly } = tool;
  return { id, type, description, tags, configuration, readonly };
};
