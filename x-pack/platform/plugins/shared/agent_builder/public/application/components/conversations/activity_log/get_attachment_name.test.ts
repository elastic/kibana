/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationActivityEventType,
  EventActorType,
  TimelineEventType,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getAttachmentName } from './get_attachment_name';
import { toActivityItems } from './to_activity_items';

const attachmentEvent = (
  type: TimelineEventType,
  data: Record<string, unknown> = {}
): ConversationEvent => ({
  id: 'event-1',
  type,
  data: {
    attachment_id: 'a1',
    attachment_type: 'dashboard',
    source: 'execution',
    current_version: 2,
    ...data,
  },
  created_at: '2026-06-01T10:00:00Z',
  actor: { type: EventActorType.agent, id: 'agent' },
});

const [added] = toActivityItems([attachmentEvent(TimelineEventType.attachmentAdded)]);
const [updated] = toActivityItems([attachmentEvent(TimelineEventType.attachmentUpdated)]);

const attachment: VersionedAttachment = {
  id: 'a1',
  type: 'dashboard',
  current_version: 3,
  versions: [
    {
      version: 1,
      data: { title: 'Old title' },
      created_at: '2026-06-01T09:00:00Z',
      content_hash: 'h1',
    },
    {
      version: 2,
      data: { title: 'eCommerceOverview' },
      created_at: '2026-06-01T10:00:00Z',
      content_hash: 'h2',
    },
    {
      version: 3,
      data: { title: 'Renamed later' },
      created_at: '2026-06-01T11:00:00Z',
      content_hash: 'h3',
    },
  ],
};

const titleLabel = ({ data }: { data: unknown }) => (data as { title?: string }).title;

describe('getAttachmentName', () => {
  it('returns undefined for events that are not about an attachment', () => {
    const [created] = toActivityItems([
      {
        ...attachmentEvent(TimelineEventType.attachmentAdded),
        type: ConversationActivityEventType.conversationCreated,
      },
    ]);

    expect(
      getAttachmentName({ event: created, attachments: [attachment], getLabel: titleLabel })
    ).toBeUndefined();
  });

  it('uses the label of the attachment at the version of the event', () => {
    expect(
      getAttachmentName({ event: updated, attachments: [attachment], getLabel: titleLabel })
    ).toBe('eCommerceOverview');
  });

  it('falls back to the description on the event when the type has no label', () => {
    const [described] = toActivityItems([
      attachmentEvent(TimelineEventType.attachmentAdded, { description: 'From the event' }),
    ]);

    expect(
      getAttachmentName({ event: described, attachments: [attachment], getLabel: () => undefined })
    ).toBe('From the event');
  });

  it('falls back to the description of the attachment', () => {
    expect(
      getAttachmentName({
        event: added,
        attachments: [{ ...attachment, description: 'On the attachment' }],
        getLabel: () => undefined,
      })
    ).toBe('On the attachment');
  });

  it('falls back to the attachment type when nothing names it', () => {
    expect(
      getAttachmentName({ event: added, attachments: [attachment], getLabel: () => undefined })
    ).toBe('dashboard');
  });

  it('falls back to the type when the attachment is not in the conversation', () => {
    expect(getAttachmentName({ event: added, attachments: [], getLabel: titleLabel })).toBe(
      'dashboard'
    );
    expect(getAttachmentName({ event: added, getLabel: titleLabel })).toBe('dashboard');
  });

  it('ignores an empty label', () => {
    expect(getAttachmentName({ event: added, attachments: [attachment], getLabel: () => '' })).toBe(
      'dashboard'
    );
  });
});
