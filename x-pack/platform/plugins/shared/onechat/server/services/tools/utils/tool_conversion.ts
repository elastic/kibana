/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDescriptor } from '@kbn/onechat-common';
import type { Runner, ExecutableTool } from '@kbn/onechat-server';
import type { RegisteredToolWithMeta } from '../types';

export const toExecutableTool = <RunInput extends ZodObject<any>, RunOutput>({
  tool,
  runner,
  request,
}: {
  tool: RegisteredToolWithMeta<RunInput, RunOutput>;
  runner: Runner;
  request: KibanaRequest;
}): ExecutableTool<RunInput, RunOutput> => {
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
export const toolToDescriptor = <T extends ToolDescriptor>(tool: T): ToolDescriptor => {
  const { id, type, description, tags, configuration } = tool;
  return { id, type, description, tags, configuration };
};
