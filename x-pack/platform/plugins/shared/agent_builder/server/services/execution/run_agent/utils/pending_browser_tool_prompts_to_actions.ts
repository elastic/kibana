/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { AttachmentType, imageAttachmentDataSchema } from '@kbn/agent-builder-common/attachments';
import type {
  BrowserToolCallPromptDefinition,
  PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import { AgentPromptType, isBrowserToolCallPrompt } from '@kbn/agent-builder-common/agents/prompts';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { toolCallAction, executeToolAction } from '../actions';
import type { ResearchAgentAction } from '../actions';
import { BROWSER_TOOL_PREFIX } from '../constants';
import type { ProcessedConversationRound } from './prepare_conversation';

/**
 * Optional field on an image tool result: a stable attachment id the tool supplies so repeated
 * captures update the same attachment in place (versioned) instead of piling up new ones.
 */
const IMAGE_ATTACHMENT_KEY_FIELD = 'image_attachment_key';
const MAX_ATTACHMENT_KEY_LENGTH = 256;

/**
 * Convert the pending browser tool call prompts + corresponding responses to a list of actions,
 * for execution resuming.
 *
 * Browser tool calls interrupt the execution instead of returning a result, so the tool call
 * never made it into the LLM message history. Here we materialize the call and the result the
 * browser reported back, so that on resume the model sees a plain tool call / tool result pair.
 *
 * Results of `result_type: 'image'` tools are not handed to the model verbatim: the image is
 * persisted as a hidden `image` attachment and the tool result is substituted with
 * `{ image_attachment_id, ...other fields }`, so base64 never enters the model context.
 */
export const pendingBrowserToolPromptsToActions = async ({
  round,
  promptState,
  attachmentStateManager,
}: {
  round: ConversationRound | ProcessedConversationRound;
  promptState: PromptStorageState;
  attachmentStateManager: AttachmentStateManager;
}): Promise<{ actions: ResearchAgentAction[]; consumedPromptIds: string[] }> => {
  const actions: ResearchAgentAction[] = [];
  const consumedPromptIds: string[] = [];

  const pendingPrompts = (round.pending_prompts ?? []).filter(isBrowserToolCallPrompt);

  for (const prompt of pendingPrompts) {
    const stored = promptState.responses[prompt.id];
    if (!stored || stored.type !== AgentPromptType.browser_tool_call) {
      throw new Error(
        `No browser_tool_call response found in prompt state for prompt_id ${prompt.id}`
      );
    }
    const { result, error } = stored.response;

    let content: string;
    if (error !== undefined) {
      content = JSON.stringify({ error });
    } else if (prompt.result_type === 'image' && result !== undefined) {
      content = await imageResultToAttachmentRef({ prompt, result, attachmentStateManager });
    } else {
      content = result ?? 'null';
    }

    const toolCallId = uuidv4();
    const toolName = sanitizeToolId(`${BROWSER_TOOL_PREFIX}${prompt.tool_id}`);

    actions.push(toolCallAction({ toolCalls: [{ toolName, toolCallId, args: prompt.params }] }));
    actions.push(executeToolAction({ toolResults: [{ toolCallId, content }] }));

    consumedPromptIds.push(prompt.id);
  }

  return { actions, consumedPromptIds };
};

/**
 * Persist an image tool result as a hidden `image` attachment and return the substituted
 * tool result content. Returns a JSON-encoded `{ error }` string when the payload is not a
 * valid image result, so the model learns the capture failed.
 */
const imageResultToAttachmentRef = async ({
  prompt,
  result,
  attachmentStateManager,
}: {
  prompt: BrowserToolCallPromptDefinition;
  result: string;
  attachmentStateManager: AttachmentStateManager;
}): Promise<string> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(result);
  } catch {
    return JSON.stringify({
      error: `Browser tool '${prompt.tool_id}' returned a non-JSON image result.`,
    });
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return JSON.stringify({
      error: `Browser tool '${prompt.tool_id}' returned an invalid image result: expected an object with 'content' and 'mime_type'.`,
    });
  }

  const {
    content,
    mime_type: mimeType,
    filename,
    [IMAGE_ATTACHMENT_KEY_FIELD]: attachmentKey,
    ...extraFields
  } = parsed as Record<string, unknown>;

  const validation = imageAttachmentDataSchema.safeParse({
    content,
    mime_type: mimeType,
    filename,
  });
  if (!validation.success) {
    return JSON.stringify({
      error: `Browser tool '${prompt.tool_id}' returned an invalid image result: ${validation.error.message}`,
    });
  }

  const stableId =
    typeof attachmentKey === 'string' &&
    attachmentKey.length > 0 &&
    attachmentKey.length <= MAX_ATTACHMENT_KEY_LENGTH
      ? attachmentKey
      : undefined;

  try {
    let attachmentId: string;
    const existing = stableId ? attachmentStateManager.getAttachmentRecord(stableId) : undefined;
    if (existing) {
      if (existing.type !== AttachmentType.image) {
        return JSON.stringify({
          error: `Attachment key '${stableId}' conflicts with an existing '${existing.type}' attachment.`,
        });
      }
      await attachmentStateManager.update(existing.id, { data: validation.data });
      attachmentId = existing.id;
    } else {
      const added = await attachmentStateManager.add({
        id: stableId,
        type: AttachmentType.image,
        data: validation.data,
        hidden: true,
        description: `Image returned by browser tool '${prompt.tool_id}'`,
      });
      attachmentId = added.id;
    }

    return JSON.stringify({ image_attachment_id: attachmentId, ...extraFields });
  } catch (e) {
    return JSON.stringify({
      error: `Failed to store the image returned by browser tool '${prompt.tool_id}': ${
        e instanceof Error ? e.message : String(e)
      }`,
    });
  }
};
