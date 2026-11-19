/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CONVERSATION_STARTER_LABEL_MAX_LENGTH,
  CONVERSATION_STARTER_PROMPT_MAX_LENGTH,
  MAX_CONVERSATION_STARTERS,
} from '@kbn/agent-builder-common';

const rejectBlank = (value: string) =>
  value.trim().length === 0 ? 'Conversation starter text must not be blank.' : undefined;

/** Up to MAX_CONVERSATION_STARTERS starters, each with a non-blank label and an optional prompt. */
export const conversationStartersSchema = ({ description }: { description: string }) =>
  schema.arrayOf(
    schema.object({
      label: schema.string({
        minLength: 1,
        maxLength: CONVERSATION_STARTER_LABEL_MAX_LENGTH,
        validate: rejectBlank,
        meta: { description: 'Short text shown on the conversation starter card.' },
      }),
      prompt: schema.maybe(
        schema.string({
          minLength: 1,
          maxLength: CONVERSATION_STARTER_PROMPT_MAX_LENGTH,
          validate: rejectBlank,
          meta: {
            description: 'Message sent when the card is clicked. When omitted, the label is sent.',
          },
        })
      ),
    }),
    {
      maxSize: MAX_CONVERSATION_STARTERS,
      meta: { description: `${description} At most ${MAX_CONVERSATION_STARTERS} are shown.` },
    }
  );
