/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { MAX_TITLE_LENGTH } from '../../../../constants';
import { ConversationAttachmentPayloadSchema } from './v2';

describe('ConversationAttachmentPayloadSchema', () => {
  const validPayload = {
    type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
    owner: 'cases',
    attachmentId: 'conversation-1',
    metadata: { title: 'Suspicious login', agentId: 'security-agent' },
  };

  it('accepts a valid payload', () => {
    expect(ConversationAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts a payload without metadata', () => {
    const { metadata: _omit, ...rest } = validPayload;
    expect(ConversationAttachmentPayloadSchema.safeParse(rest).success).toBe(true);
  });

  it('rejects an empty attachmentId', () => {
    expect(
      ConversationAttachmentPayloadSchema.safeParse({ ...validPayload, attachmentId: '' }).success
    ).toBe(false);
  });

  it('rejects a title above the max length', () => {
    expect(
      ConversationAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { title: 'a'.repeat(MAX_TITLE_LENGTH + 1) },
      }).success
    ).toBe(false);
  });

  it('rejects unknown metadata keys', () => {
    expect(
      ConversationAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { ...validPayload.metadata, soType: 'search' },
      }).success
    ).toBe(false);
  });

  it('rejects a wrong type literal', () => {
    expect(
      ConversationAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'comment' }).success
    ).toBe(false);
  });
});
