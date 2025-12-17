/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolSelection } from '@kbn/onechat-common';
import { filterToolsBySelection } from '@kbn/onechat-common';
import type { ToolProvider, ExecutableTool } from '@kbn/onechat-server';
import type { AgentConfiguration } from '@kbn/onechat-common';
import type { AttachmentsService } from '@kbn/onechat-server/runner';
import type { ProcessedConversation } from './prepare_conversation';

export const selectTools = async ({
  conversation,
  request,
  toolProvider,
  agentConfiguration,
  attachmentsService,
}: {
  conversation: ProcessedConversation;
  request: KibanaRequest;
  toolProvider: ToolProvider;
  attachmentsService: AttachmentsService;
  agentConfiguration: AgentConfiguration;
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

  // pick tools from provider (from agent config and attachment-type tools)
  const registryTools = await pickTools({
    selection: [attachmentToolSelection, ...agentConfiguration.tools],
    toolProvider,
    request,
  });

  return [...attachmentBoundTools, ...registryTools];
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
