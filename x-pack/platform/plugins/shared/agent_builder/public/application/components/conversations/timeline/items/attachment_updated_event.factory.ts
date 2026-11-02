/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AttachmentUpdatedEvent,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';

export const createAttachmentUpdatedEvent = (
  overrides?: Partial<AttachmentUpdatedEvent>
): AttachmentUpdatedEvent => ({
  id: 'attachment-updated-1',
  type: TimelineEventType.attachmentUpdated,
  created_at: '2026-09-03T11:18:50.000Z',
  actor: { type: EventActorType.system, id: 'kibana' },
  data: {
    attachment_id: 'attachment-1',
    attachment_type: 'dashboard',
    previous_version: 1,
    current_version: 2,
    render_inline: true,
    source: 'http_api',
  },
  ...overrides,
});
