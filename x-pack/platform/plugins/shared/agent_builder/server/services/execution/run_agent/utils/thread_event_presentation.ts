/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreadCreatedEvent, ThreadStartedEvent } from '@kbn/agent-builder-common';
import { getEventActorDisplayName, isThreadStartedEvent } from '@kbn/agent-builder-common';
import { generateXmlTree } from '@kbn/agent-builder-genai-utils/tools/utils';

/** Renders a thread boundary or a thread creation notice for the LLM, escaping the titles. */
export const formatThreadEvent = (event: ThreadStartedEvent | ThreadCreatedEvent): string => {
  if (isThreadStartedEvent(event)) {
    return generateXmlTree({
      tagName: 'system_notice',
      children: [
        {
          tagName: 'message',
          children: [
            'This conversation is a thread started from another conversation. The history above was copied from it up to where the thread was started. It is earlier context, not new requests.',
          ],
        },
        { tagName: 'parent_conversation_title', children: [event.data.parent_title] },
      ],
    });
  }

  return generateXmlTree({
    tagName: 'system_notice',
    children: [
      {
        tagName: 'message',
        children: [
          `${
            getEventActorDisplayName(event.actor) ?? 'A user'
          } started a thread from this conversation. Its messages are not part of this conversation.`,
        ],
      },
      { tagName: 'thread_title', children: [event.data.title] },
    ],
  });
};
