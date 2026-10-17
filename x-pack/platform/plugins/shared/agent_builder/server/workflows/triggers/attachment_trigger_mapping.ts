/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventType } from '@kbn/agent-builder-common';
import type {
  AttachmentTimelineEvent,
  AttachmentAddedTriggerEvent,
  AttachmentUpdatedTriggerEvent,
  AttachmentDeletedTriggerEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationAttachmentAddedTriggerId,
  ConversationAttachmentUpdatedTriggerId,
  ConversationAttachmentDeletedTriggerId,
} from '../../../common/workflows/triggers';

export type AttachmentTriggerPayload =
  | AttachmentAddedTriggerEvent
  | AttachmentUpdatedTriggerEvent
  | AttachmentDeletedTriggerEvent;

export interface AttachmentTriggerEvent {
  triggerId: string;
  payload: AttachmentTriggerPayload;
}

export const toAttachmentTriggerEvent = (
  conversationId: string,
  event: AttachmentTimelineEvent
): AttachmentTriggerEvent => {
  switch (event.type) {
    case TimelineEventType.attachmentAdded:
      return {
        triggerId: ConversationAttachmentAddedTriggerId,
        payload: {
          conversationId,
          attachmentId: event.data.attachment_id,
          attachmentType: event.data.attachment_type,
          currentVersion: event.data.current_version,
          source: event.data.source,
        },
      };
    case TimelineEventType.attachmentUpdated:
      return {
        triggerId: ConversationAttachmentUpdatedTriggerId,
        payload: {
          conversationId,
          attachmentId: event.data.attachment_id,
          attachmentType: event.data.attachment_type,
          previousVersion: event.data.previous_version,
          currentVersion: event.data.current_version,
          source: event.data.source,
        },
      };
    case TimelineEventType.attachmentDeleted:
      return {
        triggerId: ConversationAttachmentDeletedTriggerId,
        payload: {
          conversationId,
          attachmentId: event.data.attachment_id,
          attachmentType: event.data.attachment_type,
          hardDelete: event.data.hard_delete,
          source: event.data.source,
        },
      };
  }
};
