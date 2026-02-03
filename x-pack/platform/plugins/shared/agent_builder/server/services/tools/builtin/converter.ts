/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  StaticToolRegistration,
  InternalToolDefinition,
} from '@kbn/agent-builder-server/tools';
import type {
  ToolTypeDefinition,
  BuiltinToolTypeDefinition,
  ToolDynamicPropsContext,
} from '../tool_types/definitions';
import { isBuiltinDefinition } from '../tool_types/definitions';
import type { ToolAvailabilityCache } from './availability_cache';

export const convertTool = ({
  tool,
  definition,
  context,
  cache,
}: {
  tool: StaticToolRegistration;
  definition: ToolTypeDefinition | BuiltinToolTypeDefinition;
  context: ToolDynamicPropsContext;
  cache: ToolAvailabilityCache;
}): InternalToolDefinition => {
  if (isBuiltinToolRegistration(tool)) {
    return {
      id: tool.id,
      type: ToolType.builtin,
      description: tool.description,
      tags: tool.tags,
      configuration: {},
      readonly: true,
      confirmation: tool.confirmation ?? { askUser: 'never' },
      isAvailable: async (ctx) => {
        if (tool.availability) {
          return cache.getOrCompute(tool.id, tool.availability, ctx);
        } else {
          return { status: 'available' };
        }
      },
      getSchema: () => tool.schema,
      getHandler: () => tool.handler,
      summarizeToolReturn: tool.summarizeToolReturn,
    };
  }
  if (!isBuiltinDefinition(definition)) {
    const getDynamicProps = () => {
      return definition.getDynamicProps(tool.configuration, context);
    };

    return {
      id: tool.id,
      // static tools are surfaced as builtin
      type: ToolType.builtin,
      // static tools have their configuration obfuscated
      configuration: {},
      description: tool.description,
      tags: tool.tags,
      readonly: true,
      confirmation: tool.confirmation ?? { askUser: 'never' },
      isAvailable: (ctx) => {
        if (tool.availability) {
          return cache.getOrCompute(tool.id, tool.availability, ctx);
        } else {
          return { status: 'available' };
        }
      },
      getSchema: async () => {
        const props = await getDynamicProps();
        return props.getSchema();
      },
      getHandler: async () => {
        const props = await getDynamicProps();
        return props.getHandler();
      },
      getLlmDescription: async (args) => {
        const props = await getDynamicProps();
        return props.getLlmDescription ? props.getLlmDescription(args) : tool.description;
      },
    };
  }

  // just making TS happy, this can never happen - type guard above are on different structure is all...
  throw new Error(
    `Non-builtin tool registration has a built-in definition: ${tool.id} /  ${tool.type}`
  );
};

export const isBuiltinToolRegistration = (
  tool: StaticToolRegistration
): tool is BuiltinToolDefinition => {
  return tool.type === ToolType.builtin;
};
