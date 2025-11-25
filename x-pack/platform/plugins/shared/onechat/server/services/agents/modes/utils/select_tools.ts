/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RawRoundInput, ToolSelection } from '@kbn/onechat-common';
import { filterToolsBySelection } from '@kbn/onechat-common';
import type { ToolProvider, ExecutableTool } from '@kbn/onechat-server';
import type { AgentConfiguration, Conversation } from '@kbn/onechat-common';
import type { AttachmentsService } from '@kbn/onechat-server/runner';

export const selectTools = async ({
  input,
  conversation,
  request,
  toolProvider,
  agentConfiguration,
  attachmentsService,
}: {
  input: RawRoundInput;
  conversation?: Conversation;
  request: KibanaRequest;
  toolProvider: ToolProvider;
  attachmentsService: AttachmentsService;
  agentConfiguration: AgentConfiguration;
}) => {
  // create tool selection for attachments
  const attachmentTypes = getActiveAttachmentTypes(input, conversation);
  const attachmentToolIds = getToolsForAttachmentTypes(attachmentTypes, attachmentsService);
  const attachmentToolSelection: ToolSelection = {
    tool_ids: attachmentToolIds,
  };

  // pick tools from provider
  return await pickTools({
    selection: [attachmentToolSelection, ...agentConfiguration.tools],
    toolProvider,
    request,
  });
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

/**
 * Returns the list of attachment types that are currently used in the conversation.
 */
const getActiveAttachmentTypes = (input: RawRoundInput, conversation?: Conversation): string[] => {
  const attachments = [
    ...(input.attachments ?? []),
    ...(conversation?.rounds.flatMap((round) => round.input.attachments ?? []) ?? []),
  ];
  return [...new Set(attachments.map((att) => att.type))];
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
