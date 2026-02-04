/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
  hashContent,
} from '@kbn/agent-builder-common/attachments';
import { buildOptimisticAttachments } from './build_optimistic_attachments';

describe('buildOptimisticAttachments', () => {
  const createVersionedAttachment = ({
    id,
    type,
    data,
    currentVersion = 1,
  }: {
    id: string;
    type: string;
    data: unknown;
    currentVersion?: number;
  }): VersionedAttachment => ({
    id,
    type,
    versions: [
      {
        version: currentVersion,
        data,
        created_at: '2024-01-01T00:00:00.000Z',
        content_hash: hashContent(data),
      },
    ],
    current_version: currentVersion,
  });

  it('returns empty arrays when no attachments are provided', () => {
    const result = buildOptimisticAttachments({
      attachments: undefined,
      conversationAttachments: [],
    });

    expect(result).toEqual({ fallbackAttachments: [], attachmentRefs: [] });
  });

  it('adds an updated ref when attachment id already exists', () => {
    const conversationAttachments = [
      createVersionedAttachment({ id: 'attachment-1', type: 'text', data: { value: 'before' } }),
    ];
    const attachments: AttachmentInput[] = [
      { id: 'attachment-1', type: 'text', data: { value: 'after' } },
    ];

    const result = buildOptimisticAttachments({ attachments, conversationAttachments });

    expect(result.fallbackAttachments).toEqual([]);
    expect(result.attachmentRefs).toEqual([
      {
        attachment_id: 'attachment-1',
        version: 2,
        operation: ATTACHMENT_REF_OPERATION.updated,
        actor: ATTACHMENT_REF_ACTOR.user,
      },
    ]);
  });

  it('skips creating attachments when the content already exists', () => {
    const data = { value: 'same' };
    const conversationAttachments = [
      createVersionedAttachment({ id: 'attachment-1', type: 'text', data }),
    ];
    const attachments: AttachmentInput[] = [{ type: 'text', data }];

    const result = buildOptimisticAttachments({ attachments, conversationAttachments });

    expect(result).toEqual({ fallbackAttachments: [], attachmentRefs: [] });
  });

  it('creates a fallback attachment and ref for new inputs', () => {
    const attachments: AttachmentInput[] = [{ type: 'text', data: { value: 'new' }, hidden: true }];

    const result = buildOptimisticAttachments({ attachments, conversationAttachments: [] });

    expect(result.fallbackAttachments).toEqual([
      { id: 'pending-attachment-0', type: 'text', data: { value: 'new' }, hidden: true },
    ]);
    expect(result.attachmentRefs).toEqual([
      {
        attachment_id: 'pending-attachment-0',
        version: 1,
        operation: ATTACHMENT_REF_OPERATION.created,
        actor: ATTACHMENT_REF_ACTOR.user,
      },
    ]);
  });

  it('deduplicates new attachments with matching content', () => {
    const attachments: AttachmentInput[] = [
      { type: 'text', data: { value: 'dup' } },
      { type: 'text', data: { value: 'dup' } },
    ];

    const result = buildOptimisticAttachments({ attachments, conversationAttachments: [] });

    expect(result.fallbackAttachments).toHaveLength(1);
    expect(result.attachmentRefs).toHaveLength(1);
  });
});
