/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { ConversationUpdatedTriggerEvent } from '@kbn/agent-builder-common';
import { conversationUpdatedTriggerCommonDefinition } from './conversation_updated';

describe('ai.conversation.updated trigger definition', () => {
  const { eventSchema } = conversationUpdatedTriggerCommonDefinition;
  const payload: ConversationUpdatedTriggerEvent = {
    conversationId: 'conv-1',
    templateId: 'investigation',
    source: 'execution',
    changeKinds: ['events', 'attachments'],
    eventTypes: ['execution_started', 'execution_terminated', 'attachment_added'],
    actorTypes: ['agent'],
    executionId: 'exec-1',
    attachmentTypes: ['dashboard'],
    attachmentIds: ['a1'],
    changedFields: [],
  };

  it('has the expected id and stability', () => {
    expect(conversationUpdatedTriggerCommonDefinition.id).toBe('ai.conversation.updated');
    expect(conversationUpdatedTriggerCommonDefinition.stability).toBe('tech_preview');
  });

  it('parses a full payload and one without the optional fields', () => {
    expect(eventSchema.safeParse(payload).success).toBe(true);
    expect(eventSchema.safeParse(omit(payload, ['templateId', 'executionId'])).success).toBe(true);
  });

  it('rejects an unknown source or change kind', () => {
    expect(eventSchema.safeParse({ ...payload, source: 'chat_input' }).success).toBe(false);
    expect(eventSchema.safeParse({ ...payload, changeKinds: ['rounds'] }).success).toBe(false);
  });

  it('rejects a payload missing one of the always-present arrays', () => {
    expect(eventSchema.safeParse(omit(payload, ['changedFields'])).success).toBe(false);
  });
});
