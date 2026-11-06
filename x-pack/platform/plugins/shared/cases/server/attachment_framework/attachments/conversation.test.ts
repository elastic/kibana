/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { conversationNotFoundMessage, createConversationAttachmentType } from './conversation';

describe('createConversationAttachmentType', () => {
  const request = httpServerMock.createKibanaRequest();
  const payload = {
    type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
    owner: 'cases',
    attachmentId: 'conversation-1',
  };

  const bulkGet = jest.fn();
  const getScopedClient = jest.fn().mockResolvedValue({ bulkGet });
  const agentBuilder = { conversations: { getScopedClient } } as unknown as AgentBuilderPluginStart;
  const type = createConversationAttachmentType(async () => agentBuilder);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the conversation type with an authorable workflow schema', () => {
    expect(type.id).toBe(AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE);
    expect(type.workflowSchema).toBe(type.schema);
  });

  it('stamps the conversation title and agent onto the metadata', async () => {
    bulkGet.mockResolvedValue(
      new Map([['conversation-1', { title: 'Suspicious login', agent_id: 'security-agent' }]])
    );

    await expect(type.resolve!(payload, { request })).resolves.toEqual({
      ...payload,
      metadata: { title: 'Suspicious login', agentId: 'security-agent' },
    });
    expect(getScopedClient).toHaveBeenCalledWith({ request });
    expect(bulkGet).toHaveBeenCalledWith(['conversation-1']);
  });

  it('overrides caller-supplied metadata with the resolved values', async () => {
    bulkGet.mockResolvedValue(new Map([['conversation-1', { title: 'Real', agent_id: 'a' }]]));

    const resolved = await type.resolve!(
      { ...payload, metadata: { title: 'Spoofed', agentId: 'b' } },
      { request }
    );

    expect(resolved.metadata).toEqual({ title: 'Real', agentId: 'a' });
  });

  it('rejects with a 400 when the conversation is missing or not readable', async () => {
    // Agent Builder returns no entry for conversations the requester cannot open.
    bulkGet.mockResolvedValue(new Map());

    await expect(type.resolve!(payload, { request })).rejects.toMatchObject({
      output: { statusCode: 400 },
      message: conversationNotFoundMessage('conversation-1'),
    });
  });
});
