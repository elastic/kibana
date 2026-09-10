/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import type { KibanaRequest } from '@kbn/core/server';
import { agentBuilderDefaultAgentId, createBadRequestError } from '@kbn/agent-builder-common';
import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ChatRequestBodyPayload, MessagePersistedResponse } from '../../common/http_api/chat';
import type { ChatCallbackRequestBodyPayload } from '../../common/http_api/chat_callback';
import { getConversation } from '../services/execution/utils/conversations';
import type { RouteDependencies } from './types';

/** Persists a message without initializing an execution. */
export const getMessageOnlyHandler =
  ({ getInternalServices }: Pick<RouteDependencies, 'getInternalServices'>) =>
  async ({
    payload,
    request,
    spaceId,
    messageId = uuidv4(),
    origin: externalOrigin,
  }: {
    payload: ChatRequestBodyPayload;
    request: KibanaRequest;
    spaceId: string;
    messageId?: string;
    origin?: ChatCallbackRequestBodyPayload['origin'];
  }): Promise<MessagePersistedResponse> => {
    const executionOptions = [
      'prompts',
      'action',
      '_execution_mode',
      'execution_id',
      'connector_id',
      'inference_id',
      'browser_api_tools',
      'configuration_overrides',
      'project_routing',
    ] as const;
    for (const option of executionOptions) {
      if (payload[option] !== undefined)
        throw createBadRequestError(`${option} is not supported when trigger_mode is never`);
    }
    if (!payload.input?.trim() && !payload.attachments?.length) {
      throw createBadRequestError('Message-only requests require input or attachments');
    }
    const services = getInternalServices();
    const client = await services.conversations.getScopedClient({ request });
    const origin = externalOrigin
      ? { external_conversation_id: externalOrigin.external_conversation_id }
      : undefined;
    const conversation = await getConversation({
      agentId: payload.agent_id ?? agentBuilderDefaultAgentId,
      conversationId: payload.conversation_id,
      autoCreateConversationWithId: true,
      conversationClient: client,
      accessControl: payload.access_control,
      readOnly: payload.read_only,
      origin,
    });
    // Origin creation and callback retries without a target must address the same document.
    if (conversation.operation === 'CREATE' && !payload.conversation_id) {
      conversation.id = uuidv5(
        JSON.stringify([
          spaceId,
          externalOrigin?.type,
          origin?.external_conversation_id ?? messageId,
        ]),
        uuidv5.URL
      );
    }
    const attachments: AttachmentInput[] = [];
    for (const input of payload.attachments ?? []) {
      const result = await services.attachments.validate(input, request);
      if (!result.valid)
        throw createBadRequestError(`Attachment validation failed: ${result.error}`);
      const attachment = result.attachment as Attachment;
      attachments.push({ ...input, id: attachment.id ?? uuidv4(), data: attachment.data });
    }
    await client.appendUserMessage({
      id: conversation.id,
      ...(conversation.operation === 'CREATE' ? { create: conversation } : {}),
      messageId,
      createdAt: new Date().toISOString(),
      message: payload.input ?? '',
      author: await services.conversations.getConversationRoundAuthor({
        request,
        origin: externalOrigin,
      }),
      origin: externalOrigin ? { type: externalOrigin.type } : undefined,
      attachments,
      getTypeDefinition: services.attachments.getTypeDefinition,
    });
    return { conversation_id: conversation.id, message_id: messageId };
  };
