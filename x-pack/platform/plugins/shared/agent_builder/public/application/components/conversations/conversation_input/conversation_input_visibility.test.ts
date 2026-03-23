/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getVisibleAttachmentsForInput } from './conversation_input';

const createConversationAttachment = (id: string): VersionedAttachment => ({
  id,
  type: 'test',
  versions: [],
  current_version: 1,
});

describe('getVisibleAttachmentsForInput', () => {
  it('returns empty list when attachments should be hidden', () => {
    const result = getVisibleAttachmentsForInput({
      attachments: [{ id: 'new-id', type: 'test', data: {} }],
      shouldHideAttachments: true,
      conversationAttachments: [createConversationAttachment('existing-id')],
    });

    expect(result).toEqual([]);
  });

  it('hides attachment when id already exists in persisted conversation', () => {
    const attachments: AttachmentInput[] = [
      { id: 'existing-id', type: 'test', data: {} },
      { id: 'new-id', type: 'test', data: {} },
    ];

    const result = getVisibleAttachmentsForInput({
      attachments,
      shouldHideAttachments: false,
      conversationAttachments: [createConversationAttachment('existing-id')],
    });

    expect(result).toEqual([{ id: 'new-id', type: 'test', data: {} }]);
  });

  it('keeps attachments without id and assigns fallback id using visible index', () => {
    const attachments: AttachmentInput[] = [
      { id: 'existing-id', type: 'test', data: {} },
      { type: 'test', data: {} },
    ];

    const result = getVisibleAttachmentsForInput({
      attachments,
      shouldHideAttachments: false,
      conversationAttachments: [createConversationAttachment('existing-id')],
    });

    expect(result).toEqual([{ id: 'attachment-0', type: 'test', data: {} }]);
  });

  it('keeps attachments when conversation data is unavailable', () => {
    const attachments: AttachmentInput[] = [{ id: 'new-id', type: 'test', data: {} }];

    const result = getVisibleAttachmentsForInput({
      attachments,
      shouldHideAttachments: false,
      conversationAttachments: undefined,
    });

    expect(result).toEqual([{ id: 'new-id', type: 'test', data: {} }]);
  });
});
