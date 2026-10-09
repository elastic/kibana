/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTimelineEvent } from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import { generateXmlTree, type XmlNode } from '@kbn/agent-builder-genai-utils/tools/utils';
import { formatDate } from '../prompts/utils/helpers';
import { attachmentTypeInstructions } from '../prompts/utils/attachments';

type XmlAttributes = NonNullable<XmlNode['attributes']>;

/** The attributes only some event types carry, in rendering order. */
const typeAttributes = (event: AttachmentTimelineEvent): XmlAttributes => {
  switch (event.type) {
    case TimelineEventType.attachmentAdded:
    case TimelineEventType.attachmentRestored:
      return { version: event.data.current_version, description: event.data.description };
    case TimelineEventType.attachmentUpdated:
      return {
        version: event.data.current_version,
        previous_version: event.data.previous_version,
        description: event.data.description,
      };
    case TimelineEventType.attachmentDeleted:
      return { hard_delete: event.data.hard_delete };
  }
};

/**
 * The agent-facing block of one attachment event. Reads only the event, so the block never changes
 * once the event exists, whatever happens to the attachment later.
 */
export const formatAttachmentEvent = (event: AttachmentTimelineEvent): string => {
  const { data } = event;
  return generateXmlTree({
    tagName: 'conversation_event',
    attributes: { type: event.type, timestamp: formatDate(event.created_at) },
    children: [
      {
        tagName: 'attachment',
        attributes: {
          attachment_id: data.attachment_id,
          attachment_type: data.attachment_type,
          ...typeAttributes(event),
          actor: event.actor.type,
          source: data.source,
          hidden: data.hidden ? true : undefined,
        },
      },
    ],
  });
};

/** Renders attachment events into notices, giving each type's instructions once per prompt. */
export interface AttachmentNoticeRenderer {
  /** The events' blocks, then the instructions of the types not given yet; '' for no events. */
  render(events: readonly AttachmentTimelineEvent[]): string;
  /** The instructions of the given types not given yet, marking them given; '' when none. */
  typeInstructions(types: readonly string[]): string;
}

export const createAttachmentNoticeRenderer = ({
  describeType,
  withTypeInstructions = true,
}: {
  describeType: (type: string) => string | undefined;
  withTypeInstructions?: boolean;
}): AttachmentNoticeRenderer => {
  const provided = new Set<string>();
  const typeInstructions = (types: readonly string[]): string => {
    if (!withTypeInstructions) {
      return '';
    }
    const fresh = [...new Set(types)].filter((type) => !provided.has(type));
    fresh.forEach((type) => provided.add(type));
    return attachmentTypeInstructions(
      fresh.map((type) => ({ type, description: describeType(type) }))
    );
  };
  return {
    typeInstructions,
    render: (events) => {
      if (events.length === 0) {
        return '';
      }
      const blocks = events.map(formatAttachmentEvent).join('\n');
      const instructions = typeInstructions(events.map((event) => event.data.attachment_type));
      return instructions ? `${blocks}\n\n${instructions}` : blocks;
    },
  };
};
