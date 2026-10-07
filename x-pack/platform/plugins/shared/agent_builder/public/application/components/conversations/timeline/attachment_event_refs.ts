/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTimelineEvent } from '@kbn/agent-builder-common';
import {
  TimelineEventType,
  isAttachmentEvent,
  isCurrentFormatAttachmentEvent,
} from '@kbn/agent-builder-common';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
} from '@kbn/agent-builder-common/attachments';
import type { TimelineDisplayEvent } from '../../../../services/events';

/** The ref an added or updated event stands for; deletions and restores have none. */
export const attachmentEventToRef = (
  event: AttachmentTimelineEvent
): AttachmentVersionRef | undefined => {
  if (
    event.type !== TimelineEventType.attachmentAdded &&
    event.type !== TimelineEventType.attachmentUpdated
  ) {
    return undefined;
  }
  return {
    attachment_id: event.data.attachment_id,
    version: event.data.current_version,
    operation:
      event.type === TimelineEventType.attachmentAdded
        ? ATTACHMENT_REF_OPERATION.created
        : ATTACHMENT_REF_OPERATION.updated,
    actor:
      event.data.source === 'chat_input' ? ATTACHMENT_REF_ACTOR.user : ATTACHMENT_REF_ACTOR.agent,
  };
};

/** Current-format, visible attachment events; legacy refs stand for the older ones. */
const shownAttachmentEvents = (events: TimelineDisplayEvent[]): AttachmentTimelineEvent[] =>
  events
    .filter(isAttachmentEvent)
    .filter((event) => isCurrentFormatAttachmentEvent(event) && !event.data.hidden);

const append = (
  map: Map<string, AttachmentVersionRef[]>,
  key: string,
  ref: AttachmentVersionRef
): void => {
  map.set(key, [...(map.get(key) ?? []), ref]);
};

/** Refs of the attachments sent with each message, keyed by message id; they are stored after it. */
export const inputRefsByMessageId = (
  events: TimelineDisplayEvent[]
): Map<string, AttachmentVersionRef[]> => {
  const refs = new Map<string, AttachmentVersionRef[]>();
  for (const event of shownAttachmentEvents(events)) {
    const ref = attachmentEventToRef(event);
    if (ref && event.data.source === 'chat_input' && event.trigger_event_id) {
      append(refs, event.trigger_event_id, ref);
    }
  }
  return refs;
};

/** Refs of the attachments each turn's agent added or updated, keyed by the turn's first execution. */
export const agentRefsByExecutionId = (
  events: TimelineDisplayEvent[],
  resumeLinks: Map<string, string>
): Map<string, AttachmentVersionRef[]> => {
  const refs = new Map<string, AttachmentVersionRef[]>();
  for (const event of shownAttachmentEvents(events)) {
    const ref = attachmentEventToRef(event);
    if (ref && event.data.source === 'execution' && event.execution_id) {
      append(refs, resumeLinks.get(event.execution_id) ?? event.execution_id, ref);
    }
  }
  return refs;
};
