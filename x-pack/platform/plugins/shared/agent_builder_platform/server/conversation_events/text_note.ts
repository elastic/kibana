/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server';

import { TEXT_NOTE_EVENT_TYPE } from '../../common/conversation_events/constants';
import { textNoteEventSchema } from '../../common/conversation_events/text_note';

export const textNoteEventType: ConversationEventTypeDefinition<
  typeof TEXT_NOTE_EVENT_TYPE,
  typeof textNoteEventSchema
> = {
  type: TEXT_NOTE_EVENT_TYPE,
  payloadSchema: textNoteEventSchema,
  format: ({ data }) => ({
    type: 'text',
    value: data.title ? `${data.title}\n${data.text}` : data.text,
  }),
};
