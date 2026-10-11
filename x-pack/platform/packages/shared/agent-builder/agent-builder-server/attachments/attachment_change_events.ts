/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ATTACHMENT_EVENT_FORMAT, TimelineEventType } from '@kbn/agent-builder-common';
import type {
  AttachmentEventSource,
  AttachmentTimelineEvent,
  EventActor,
} from '@kbn/agent-builder-common';
import type { AttachmentChange } from './attachment_state_manager';

export interface AttachmentChangesToEventsOptions {
  source: AttachmentEventSource;
  actor: EventActor;
  /** Defaults to false. Ignored for deletions and restores. */
  render_inline?: boolean;
  /** Set for changes made inside an agent run. */
  execution_id?: string;
  /** The content event the changes belong to: the run's trigger, or the message they were sent with. */
  trigger_event_id?: string;
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
    trigger_event_id: triggerEventId,
    created_at: createdAt = new Date().toISOString(),
  }: AttachmentChangesToEventsOptions
): AttachmentTimelineEvent[] => {
  const envelope = {
    actor,
    created_at: createdAt,
    ...(executionId !== undefined ? { execution_id: executionId } : {}),
    ...(triggerEventId !== undefined ? { trigger_event_id: triggerEventId } : {}),
  };

  return changes.map((change): AttachmentTimelineEvent => {
    const common = {
      attachment_id: change.attachment_id,
      attachment_type: change.attachment_type,
      source,
      format: ATTACHMENT_EVENT_FORMAT,
      ...(change.tool_call_id !== undefined ? { tool_call_id: change.tool_call_id } : {}),
      ...(change.hidden ? { hidden: true } : {}),
    };
    const described = change.description !== undefined ? { description: change.description } : {};
    switch (change.kind) {
      case 'added':
        return {
          ...envelope,
          id: uuidv4(),
          type: TimelineEventType.attachmentAdded,
          data: {
            ...common,
            ...described,
            current_version: change.current_version,
            render_inline: renderInline,
          },
        };
      case 'updated':
        return {
          ...envelope,
          id: uuidv4(),
          type: TimelineEventType.attachmentUpdated,
          data: {
            ...common,
            ...described,
            previous_version: change.previous_version,
            current_version: change.current_version,
            render_inline: renderInline,
          },
        };
      case 'deleted':
        return {
          ...envelope,
          id: uuidv4(),
          type: TimelineEventType.attachmentDeleted,
          data: { ...common, hard_delete: change.hard_delete },
        };
      case 'restored':
        return {
          ...envelope,
          id: uuidv4(),
          type: TimelineEventType.attachmentRestored,
          data: { ...common, ...described, current_version: change.current_version },
        };
    }
  });
};
