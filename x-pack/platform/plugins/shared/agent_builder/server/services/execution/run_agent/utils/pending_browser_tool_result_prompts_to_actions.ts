/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ToolResultType,
  type ChatAgentEvent,
  type ConversationRound,
  type ToolResult,
} from '@kbn/agent-builder-common';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import {
  AgentPromptType,
  isBrowserToolResultPrompt,
  type BrowserToolResultPrompt,
  type BrowserToolResultPromptResponse,
  type PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import {
  executeToolAction,
  toolCallAction,
  userImageAction,
  type ResearchAgentAction,
} from '../actions';
import { BROWSER_TOOL_PREFIX } from '../constants';
import type { ProcessedConversationRound } from './prepare_conversation';

/**
 * Convert pending `browser_tool_result` prompts + client responses into research actions.
 * Optionally persists a successful screenshot as a conversation image attachment.
 */
export const pendingBrowserToolResultPromptsToActions = async ({
  round,
  promptState,
  attachments,
}: {
  round: ConversationRound | ProcessedConversationRound;
  promptState: PromptStorageState;
  attachments?: AttachmentStateManager;
  /** Unused today; kept for parity with ask_user helper signature / future events. */
  eventEmitter?: (event: ChatAgentEvent) => void;
}): Promise<{ actions: ResearchAgentAction[]; consumedPromptIds: string[] }> => {
  const actions: ResearchAgentAction[] = [];
  const consumedPromptIds: string[] = [];

  const pendingPrompts = (round.pending_prompts ?? []).filter(isBrowserToolResultPrompt);

  for (const prompt of pendingPrompts) {
    const stored = promptState.responses[prompt.id];
    if (!stored || stored.type !== AgentPromptType.browser_tool_result) {
      throw new Error(
        `No browser_tool_result response found in prompt state for prompt_id ${prompt.id}`
      );
    }

    const response = stored.response;
    const { toolCallId, toolName, args, content, artifact, imageAction } =
      await materializeBrowserToolResult({
        prompt,
        response,
        attachments,
      });

    actions.push(toolCallAction({ toolCalls: [{ toolName, toolCallId, args }] }));
    actions.push(
      executeToolAction({
        toolResults: [{ toolCallId, content, artifact }],
      })
    );
    if (imageAction) {
      actions.push(imageAction);
    }

    consumedPromptIds.push(prompt.id);
  }

  return { actions, consumedPromptIds };
};

const materializeBrowserToolResult = async ({
  prompt,
  response,
  attachments,
}: {
  prompt: BrowserToolResultPrompt;
  response: BrowserToolResultPromptResponse;
  attachments?: AttachmentStateManager;
}): Promise<{
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  content: string;
  artifact: { results: ToolResult[] };
  imageAction: ReturnType<typeof userImageAction> | undefined;
}> => {
  const toolCallId = prompt.tool_call_id || uuidv4();
  const toolName = sanitizeToolId(`${BROWSER_TOOL_PREFIX}${prompt.tool_id}`);
  const args = prompt.params ?? {};

  if (!response.ok) {
    const errorMessage = response.error ?? 'Browser tool execution failed';
    const results: ToolResult[] = [
      {
        type: ToolResultType.error,
        data: { message: errorMessage },
      },
    ];
    return {
      toolCallId,
      toolName,
      args,
      content: JSON.stringify({ results }),
      artifact: { results },
      imageAction: undefined,
    };
  }

  let results: ToolResult[] =
    response.results && response.results.length > 0
      ? (response.results as ToolResult[])
      : [
          {
            type: ToolResultType.other,
            data: { message: `Browser tool '${prompt.tool_id}' completed successfully` },
          },
        ];

  let imageAction: ReturnType<typeof userImageAction> | undefined;

  if (response.image) {
    let attachmentId: string | undefined;
    if (attachments) {
      try {
        const attachment = await attachments.add({
          type: AttachmentType.image,
          data: response.image,
          description: `Screenshot from browser tool '${prompt.tool_id}'`,
        });
        attachmentId = attachment.id;
      } catch {
        // Multimodal injection below still works without persisted attachment.
      }
    }

    results = [
      ...results,
      {
        type: ToolResultType.other,
        data: {
          message: 'Screenshot captured for visual validation',
          media_type: response.image.media_type,
          ...(attachmentId ? { attachment_id: attachmentId } : {}),
        },
      },
    ];

    imageAction = userImageAction({
      image: response.image,
      caption: `<system-notice>
The following image is a live screenshot returned by browser tool "${prompt.tool_id}".
Use it to visually validate the current UI (layout, overlap, empty charts, cramped titles).
</system-notice>`,
    });
  }

  return {
    toolCallId,
    toolName,
    args,
    content: JSON.stringify({ results }),
    artifact: { results },
    imageAction,
  };
};
