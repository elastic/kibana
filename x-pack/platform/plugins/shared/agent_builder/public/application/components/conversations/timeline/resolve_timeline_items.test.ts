/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveTimelineItems } from './resolve_timeline_items';
import type { ConversationEventUIDefinition } from '@kbn/agent-builder-browser';
import type { GroupedItem, UnresolvedAttachmentItem, UnresolvedCustomEventItem } from './types';
import { createAttachmentAddedEvent } from './items/attachment_added_event.factory';
import { createAttachmentUpdatedEvent } from './items/attachment_updated_event.factory';
import { CUSTOM_EVENT_TYPE, createCustomEvent } from './items/custom_event.factory';
import { createCompletedTurnItem, createUserMessageItem } from './items/timeline_item.factory';
import { createVersionedAttachment } from './items/versioned_attachment.factory';

const customEventDefinition: ConversationEventUIDefinition = {
  type: CUSTOM_EVENT_TYPE,
  render: () => null,
};

const services = {
  attachmentsService: { hasAttachmentType: (type: string) => type === 'dashboard' },
  conversationEventsService: {
    getUiDefinition: (type: string) =>
      type === CUSTOM_EVENT_TYPE ? customEventDefinition : undefined,
  },
};

const customEventItem = (type: string = CUSTOM_EVENT_TYPE): UnresolvedCustomEventItem => {
  const event = createCustomEvent({ id: `custom-${type}`, type });
  return { kind: 'customEvent', key: event.id, event };
};

const addedItem = (): UnresolvedAttachmentItem => {
  const event = createAttachmentAddedEvent();
  return { kind: 'attachment', key: event.id, event };
};

describe('resolveTimelineItems', () => {
  it('passes built-in items through untouched', () => {
    const items: GroupedItem[] = [createUserMessageItem(), createCompletedTurnItem()];

    expect(resolveTimelineItems(items, services)).toEqual(items);
  });

  it('attaches the record and version to an attachment item that can draw', () => {
    const attachment = createVersionedAttachment();
    const item = addedItem();

    const [resolved] = resolveTimelineItems([item], {
      attachments: [attachment],
      ...services,
    });

    expect(resolved).toEqual({ ...item, attachment, version: 1 });
  });

  it('resolves an updated event to its current version', () => {
    const attachment = createVersionedAttachment({
      current_version: 2,
      versions: [
        { version: 1, data: {}, created_at: '2026-09-03T11:17:50.000Z', content_hash: 'a' },
        { version: 2, data: {}, created_at: '2026-09-03T11:18:50.000Z', content_hash: 'b' },
      ],
    });
    const event = createAttachmentUpdatedEvent();

    const [resolved] = resolveTimelineItems([{ kind: 'attachment', key: event.id, event }], {
      attachments: [attachment],
      ...services,
    });

    expect(resolved.kind === 'attachment' && resolved.version).toBe(2);
  });

  it('drops the item when the attachment is not in the conversation', () => {
    expect(resolveTimelineItems([addedItem()], { attachments: [], ...services })).toEqual([]);
    expect(resolveTimelineItems([addedItem()], services)).toEqual([]);
  });

  it('drops the item when the attachment type has no registered UI', () => {
    const attachment = createVersionedAttachment({ type: 'unknown_type' });

    expect(
      resolveTimelineItems([addedItem()], {
        attachments: [attachment],
        ...services,
      })
    ).toEqual([]);
  });

  it('drops hidden and inactive attachments', () => {
    const hidden = createVersionedAttachment({ hidden: true });
    const inactive = createVersionedAttachment({ active: false });

    for (const attachment of [hidden, inactive]) {
      expect(
        resolveTimelineItems([addedItem()], {
          attachments: [attachment],
          ...services,
        })
      ).toEqual([]);
    }
  });

  it('drops the item when the event points at a version the attachment no longer has', () => {
    const attachment = createVersionedAttachment({
      current_version: 2,
      versions: [
        { version: 2, data: {}, created_at: '2026-09-03T11:18:50.000Z', content_hash: 'b' },
      ],
    });

    expect(
      resolveTimelineItems([addedItem()], {
        attachments: [attachment],
        ...services,
      })
    ).toEqual([]);
  });

  it('attaches the definition to a custom event whose type has a registered UI', () => {
    const item = customEventItem();

    expect(resolveTimelineItems([item], services)).toEqual([
      { ...item, definition: customEventDefinition },
    ]);
  });

  it('drops a custom event whose type has no registered UI', () => {
    expect(resolveTimelineItems([customEventItem('unregistered_type')], services)).toEqual([]);
  });

  it('keeps the order of the surviving items', () => {
    const attachment = createVersionedAttachment();
    const user = createUserMessageItem();
    const turn = createCompletedTurnItem();
    const ok = addedItem();
    const missingEvent = createAttachmentAddedEvent({
      id: 'aa-missing',
      data: { ...createAttachmentAddedEvent().data, attachment_id: 'missing' },
    });
    const missing: UnresolvedAttachmentItem = {
      kind: 'attachment',
      key: missingEvent.id,
      event: missingEvent,
    };

    const custom = customEventItem();
    const unregistered = customEventItem('unregistered_type');

    const resolved = resolveTimelineItems([user, missing, custom, turn, unregistered, ok], {
      attachments: [attachment],
      ...services,
    });

    expect(resolved.map((item) => item.key)).toEqual([user.key, custom.key, turn.key, ok.key]);
  });
});
