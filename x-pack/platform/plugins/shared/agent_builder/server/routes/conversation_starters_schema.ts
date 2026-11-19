/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CONVERSATION_STARTER_MAX_LENGTH,
  MAX_CONVERSATION_STARTERS,
} from '@kbn/agent-builder-common';

/** Up to MAX_CONVERSATION_STARTERS non-blank strings, each at most CONVERSATION_STARTER_MAX_LENGTH long. */
export const conversationStartersSchema = ({ description }: { description: string }) =>
  schema.arrayOf(
    schema.string({
      minLength: 1,
      maxLength: CONVERSATION_STARTER_MAX_LENGTH,
      validate: (starter) =>
        starter.trim().length === 0 ? 'Conversation starters must not be blank.' : undefined,
      meta: { description: 'Text of a conversation starter.' },
    }),
    {
      maxSize: MAX_CONVERSATION_STARTERS,
      meta: { description: `${description} At most ${MAX_CONVERSATION_STARTERS} are shown.` },
    }
  );
