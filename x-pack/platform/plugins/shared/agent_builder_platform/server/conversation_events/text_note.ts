/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server';

import { TEXT_NOTE_EVENT_TYPE } from '../../common/conversation_events/constants';

export const textNoteEventType: ConversationEventTypeDefinition = {
  type: TEXT_NOTE_EVENT_TYPE,
  payloadSchema: z.object({
    title: z.string().min(1).max(256).optional(),
    text: z.string().min(1).max(1000),
  }),
};
