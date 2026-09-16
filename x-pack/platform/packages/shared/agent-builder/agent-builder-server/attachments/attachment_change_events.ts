/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type {
  AttachmentEventSource,
  AttachmentTimelineEvent,
  EventActor,
} from '@kbn/agent-builder-common';
import type { AttachmentChange } from './attachment_state_manager';

export interface AttachmentChangesToEventsOptions {
  source: AttachmentEventSource;
  actor: EventActor;
  /** Defaults to false. Ignored for deletions. */
  render_inline?: boolean;
  /** Set for changes made inside an agent run. */
  execution_id?: string;
  /** Defaults to now. */
  created_at?: string;
}

/**
 * Materializes state-manager changes into stored attachment timeline events.
 */
export const attachmentChangesToEvents = (
  changes: AttachmentChange[],
  {
    source,
    actor,
    render_inline: renderInline = false,
    execution_id: executionId,
    created_at: createdAt = new Date().toISOString(),
  }: AttachmentChangesToEventsOptions
): AttachmentTimelineEvent[] => {
  const envelope = {
    actor,
    created_at: createdAt,
    ...(executionId !== undefined ? { execution_id: executionId } : {}),
  };

  return changes.map((change): AttachmentTimelineEvent => {
    switch (change.kind) {
      case 'added':
        return {
          ...envelope,
          id: uuidv4(),
          type: TimelineEventType.attachmentAdded,
          data: {
            attachment_id: change.attachment_id,
            attachment_type: change.attachment_type,
            current_version: change.current_version,
            render_inline: renderInline,
            source,
          },
        };
      case 'updated':
        return {
          ...envelope,
          id: uuidv4(),
          type: TimelineEventType.attachmentUpdated,
          data: {
            attachment_id: change.attachment_id,
            attachment_type: change.attachment_type,
            previous_version: change.previous_version,
            current_version: change.current_version,
            render_inline: renderInline,
            source,
          },
        };
      case 'deleted':
        return {
          ...envelope,
          id: uuidv4(),
          type: TimelineEventType.attachmentDeleted,
          data: {
            attachment_id: change.attachment_id,
            attachment_type: change.attachment_type,
            hard_delete: change.hard_delete,
            source,
          },
        };
    }
  });
};
