/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttachmentsService, ExecutableTool } from '@kbn/agent-builder-server/runner';
import type { Runner, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { ToolType } from '@kbn/agent-builder-common';
import type { AttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import type { AnyToolTypeDefinition, ToolTypeDefinition } from '../../tools/tool_types';
import { convertTool } from '../../tools/builtin/converter';
import { toExecutableTool } from '../../tools/utils/tool_conversion';
import type { ToolDynamicPropsContext } from '../../tools/tool_types/definitions';
import type { BuiltinToolTypeDefinition } from '../../tools/tool_types/definitions';
import { isDisabledDefinition } from '../../tools/tool_types/definitions';
import { ToolAvailabilityCache } from '../../tools/builtin/availability_cache';
import type { AttachmentServiceStart } from '../../attachments';
import type { ToolsServiceStart } from '../../tools';

export const createAttachmentsService = ({
  attachmentsStart,
  toolsStart,
  runner,
  request,
  spaceId,
}: {
  attachmentsStart: AttachmentServiceStart;
  toolsStart: ToolsServiceStart;
  runner: Runner;
  request: KibanaRequest;
  spaceId: string;
}): AttachmentsService => {
  const toolConverterFn = createToolConverter({
    request,
    spaceId,
    definitions: toolsStart.getToolDefinitions(),
    runner,
  });

  return {
    getTypeDefinition: (type) => {
      return attachmentsStart.getTypeDefinition(type);
    },
    convertAttachmentTool: toolConverterFn,
  };
};

type AttachmentToolConverterFn = (tool: AttachmentBoundedTool) => ExecutableTool;

export const createToolConverter = ({
  request,
  spaceId,
  definitions,
  runner,
}: {
  request: KibanaRequest;
  spaceId: string;
  definitions: AnyToolTypeDefinition[];
  runner: Runner;
}): AttachmentToolConverterFn => {
  const definitionMap = definitions
    .filter((def) => !isDisabledDefinition(def))
    .reduce((map, def) => {
      map[def.toolType] = def as ToolTypeDefinition | BuiltinToolTypeDefinition;
      return map;
    }, {} as Record<ToolType, ToolTypeDefinition | BuiltinToolTypeDefinition>);

  const context: ToolDynamicPropsContext = {
    spaceId,
    request,
  };

  const cache = new ToolAvailabilityCache();

  return (tool) => {
    const definition = definitionMap[tool.type]!;
    const converted: StaticToolRegistration = {
      ...tool,
      tags: [] as string[],
    } as StaticToolRegistration;
    const internal = convertTool({ tool: converted, context, definition, cache });
    return toExecutableTool({ tool: internal, request, runner, asInternal: true });
  };
};
