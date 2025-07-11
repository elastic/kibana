/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import zodToJsonSchema, { JsonSchema7ObjectType } from 'zod-to-json-schema';
import type { ZodObject } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import type { Runner, ExecutableTool } from '@kbn/onechat-server';
import { InternalToolDefinition } from '../tool_provider';

export const toExecutableTool = <
  TConfig extends object = {},
  RunInput extends ZodObject<any> = ZodObject<any>,
  RunOutput = unknown
>({
  tool,
  runner,
  request,
}: {
  tool: InternalToolDefinition<TConfig, RunInput, RunOutput>;
  runner: Runner;
  request: KibanaRequest;
}): ExecutableTool<TConfig, RunInput, RunOutput> => {
  const { handler, ...toolParts } = tool;

  return {
    ...toolParts,
    execute: (params) => {
      return runner.runTool({ ...params, toolId: tool.id, request });
    },
  };
};

/**
 * Remove all additional properties from a tool descriptor.
 *
 * Can be used to convert/clean tool registration for public-facing APIs.
 */
export const toolToDescriptor = (tool: InternalToolDefinition): ToolDefinitionWithSchema => {
  const { id, type, description, tags, configuration, schema } = tool;
  const jsonSchema = zodToJsonSchema(schema) as JsonSchema7ObjectType;
  return { id, type, description, tags, configuration, schema: jsonSchema };
};
