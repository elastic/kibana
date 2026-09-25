/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ConversationEvent } from '@kbn/agent-builder-common';
import { EventActorType } from '@kbn/agent-builder-common';
import type { ConversationEventFormatContext } from '@kbn/agent-builder-server';
import { TEXT_NOTE_EVENT_TYPE } from '../../common/conversation_events/constants';
import { textNoteEventType } from './text_note';

describe('textNoteEventType', () => {
  const context: ConversationEventFormatContext = {
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
  };

  const event = (data: {
    title?: string;
    text: string;
  }): ConversationEvent<typeof TEXT_NOTE_EVENT_TYPE, { title?: string; text: string }> => ({
    id: 'evt-1',
    type: TEXT_NOTE_EVENT_TYPE,
    created_at: '2026-01-01T00:00:00.000Z',
    actor: { type: EventActorType.user, id: 'u1' },
    data,
  });

  it('is registered under the text_note type', () => {
    expect(textNoteEventType.type).toBe('text_note');
  });

  it('formats the text alone when there is no title', async () => {
    const representation = await textNoteEventType.format!(event({ text: 'Just a note' }), context);

    expect(representation).toEqual({ type: 'text', value: 'Just a note' });
  });

  it('formats the title on its own line above the text', async () => {
    const representation = await textNoteEventType.format!(
      event({ title: 'Deploy freeze', text: 'No deploys this week.' }),
      context
    );

    expect(representation).toEqual({
      type: 'text',
      value: 'Deploy freeze\nNo deploys this week.',
    });
  });

  it('keeps validating the payload against its schema', () => {
    expect(textNoteEventType.payloadSchema.safeParse({ text: 'ok' }).success).toBe(true);
    expect(textNoteEventType.payloadSchema.safeParse({ text: '' }).success).toBe(false);
    expect(textNoteEventType.payloadSchema.safeParse({ title: 'no text' }).success).toBe(false);
  });
});
