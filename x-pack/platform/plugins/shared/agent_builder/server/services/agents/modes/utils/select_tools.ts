/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolSelection } from '@kbn/agent-builder-common';
import { ToolType, filterToolsBySelection } from '@kbn/agent-builder-common';
import type { ToolProvider, ExecutableTool, ScopedRunner } from '@kbn/agent-builder-server';
import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createAttachmentTools } from '../../../tools/builtin/attachments';
import type { ProcessedConversation } from './prepare_conversation';

export const selectTools = async ({
  conversation,
  request,
  toolProvider,
  agentConfiguration,
  attachmentsService,
  runner,
}: {
  conversation: ProcessedConversation;
  request: KibanaRequest;
  toolProvider: ToolProvider;
  attachmentsService: AttachmentsService;
  agentConfiguration: AgentConfiguration;
  runner: ScopedRunner;
}) => {
  // create tool selection for attachments types
  const attachmentTypes = conversation.attachmentTypes.map((type) => type.type);
  const attachmentToolIds = getToolsForAttachmentTypes(attachmentTypes, attachmentsService);
  const attachmentToolSelection: ToolSelection = {
    tool_ids: attachmentToolIds,
  };

  // convert attachment-bound tools
  const attachmentBoundTools = conversation.attachments
    .flatMap((attachment) => attachment.tools)
    .map((tool) => attachmentsService.convertAttachmentTool(tool));

  const versionedAttachmentTools = createVersionedAttachmentTools({
    attachmentStateManager: conversation.attachmentStateManager,
    runner,
  });

  // pick tools from provider (from agent config and attachment-type tools)
  const registryTools = await pickTools({
    selection: [attachmentToolSelection, ...agentConfiguration.tools],
    toolProvider,
    request,
  });

  return [...attachmentBoundTools, ...versionedAttachmentTools, ...registryTools];
};

/**
 * Creates executable tools for managing versioned conversation attachments.
 * These tools allow the LLM to add, read, update, delete, restore, list, and diff attachments.
 */
const createVersionedAttachmentTools = ({
  attachmentStateManager,
  runner,
}: {
  attachmentStateManager: AttachmentStateManager;
  runner: ScopedRunner;
}): ExecutableTool[] => {
  const builtinTools = createAttachmentTools({ attachmentManager: attachmentStateManager });

  return builtinTools.map((tool) => ({
    id: tool.id,
    type: ToolType.builtin,
    description: tool.description,
    tags: tool.tags,
    configuration: {},
    readonly: true,
    isAvailable: async () => ({ status: 'available' as const }),
    getSchema: () => tool.schema,
    execute: async (params) => {
      return runner.runInternalTool({
        ...params,
        tool: {
          id: tool.id,
          type: ToolType.builtin,
          description: tool.description,
          tags: tool.tags,
          configuration: {},
          readonly: true,
          confirmation: { askUser: 'never' },
          isAvailable: async () => ({ status: 'available' as const }),
          getSchema: () => tool.schema,
          getHandler: () => tool.handler,
        },
      });
    },
  }));
};

const getToolsForAttachmentTypes = (
  attachmentTypes: string[],
  attachmentsService: AttachmentsService
): string[] => {
  const tools = new Set<string>();

  for (const type of attachmentTypes) {
    const definition = attachmentsService.getTypeDefinition(type);
    if (definition && definition.getTools) {
      const definitionTools = definition.getTools();
      definitionTools.forEach((toolId) => tools.add(toolId));
    }
  }

  return [...tools];
};

const pickTools = async ({
  toolProvider,
  selection,
  request,
}: {
  toolProvider: ToolProvider;
  selection: ToolSelection[];
  request: KibanaRequest;
}): Promise<ExecutableTool[]> => {
  const tools = await toolProvider.list({ request });
  return filterToolsBySelection(tools, selection);
};
