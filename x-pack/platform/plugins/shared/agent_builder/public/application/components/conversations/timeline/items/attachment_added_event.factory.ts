/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AttachmentAddedEvent,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';

export const createAttachmentAddedEvent = (
  overrides?: Partial<AttachmentAddedEvent>
): AttachmentAddedEvent => ({
  id: 'attachment-added-1',
  type: TimelineEventType.attachmentAdded,
  created_at: '2026-09-03T11:17:50.000Z',
  actor: { type: EventActorType.system, id: 'kibana' },
  data: {
    attachment_id: 'attachment-1',
    attachment_type: 'dashboard',
    current_version: 1,
    render_inline: true,
    source: 'http_api',
  },
  ...overrides,
});
