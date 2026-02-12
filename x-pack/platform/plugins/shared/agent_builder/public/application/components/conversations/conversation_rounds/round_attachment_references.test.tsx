/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type {
  Attachment,
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
} from '@kbn/agent-builder-common/attachments';
import { RoundAttachmentReferences } from './round_attachment_references';

jest.mock('./round_attachment_reference_pill', () => ({
  AttachmentReferencePill: ({ attachment, operation }: any) => (
    <span data-test-subj="attachment-pill">{`${attachment.id}:${operation}`}</span>
  ),
}));

const createVersionedAttachment = (id: string): VersionedAttachment => ({
  id,
  type: 'text',
  versions: [
    {
      version: 1,
      data: 'content',
      created_at: '2024-01-01T00:00:00.000Z',
      content_hash: `hash-${id}`,
    },
  ],
  current_version: 1,
  active: true,
});

describe('RoundAttachmentReferences', () => {
  it('uses conversationAttachments when provided', () => {
    const conversationAttachments = [createVersionedAttachment('conv-1')];
    const fallbackAttachments: Attachment[] = [
      { id: 'fallback-1', type: 'text', data: { data: 'fallback' } },
    ];
    const attachmentRefs: AttachmentVersionRef[] = [
      {
        attachment_id: 'conv-1',
        version: 1,
        operation: ATTACHMENT_REF_OPERATION.created,
        actor: ATTACHMENT_REF_ACTOR.user,
      },
    ];

    render(
      <RoundAttachmentReferences
        attachmentRefs={attachmentRefs}
        conversationAttachments={conversationAttachments}
        fallbackAttachments={fallbackAttachments}
      />
    );

    expect(screen.getAllByTestId('attachment-pill')).toHaveLength(1);
    expect(screen.getByText('conv-1:created')).toBeInTheDocument();
  });

  it('falls back to optimistic attachments when conversationAttachments are missing', () => {
    const fallbackAttachments: Attachment[] = [
      { id: 'fallback-1', type: 'text', data: { prop: 'fallback-1' } },
      { id: 'fallback-2', type: 'text', data: { prop: 'fallback-2' } },
    ];

    render(<RoundAttachmentReferences fallbackAttachments={fallbackAttachments} />);

    const pills = screen.getAllByTestId('attachment-pill');
    expect(pills).toHaveLength(2);
    expect(screen.getByText('fallback-1:created')).toBeInTheDocument();
    expect(screen.getByText('fallback-2:created')).toBeInTheDocument();
  });

  it('filters by actor when actorFilter is provided', () => {
    const conversationAttachments = [
      createVersionedAttachment('att-user'),
      createVersionedAttachment('att-agent'),
    ];
    const attachmentRefs: AttachmentVersionRef[] = [
      {
        attachment_id: 'att-user',
        version: 1,
        operation: ATTACHMENT_REF_OPERATION.created,
        actor: ATTACHMENT_REF_ACTOR.user,
      },
      {
        attachment_id: 'att-agent',
        version: 1,
        operation: ATTACHMENT_REF_OPERATION.read,
        actor: ATTACHMENT_REF_ACTOR.agent,
      },
    ];

    render(
      <RoundAttachmentReferences
        attachmentRefs={attachmentRefs}
        conversationAttachments={conversationAttachments}
        actorFilter={[ATTACHMENT_REF_ACTOR.user]}
      />
    );

    const pills = screen.getAllByTestId('attachment-pill');
    expect(pills).toHaveLength(1);
    expect(screen.getByText('att-user:created')).toBeInTheDocument();
  });

  it('skips hidden attachments from conversationAttachments', () => {
    const conversationAttachments: VersionedAttachment[] = [
      createVersionedAttachment('visible'),
      { ...createVersionedAttachment('hidden'), hidden: true },
    ];
    const attachmentRefs: AttachmentVersionRef[] = [
      {
        attachment_id: 'visible',
        version: 1,
        operation: ATTACHMENT_REF_OPERATION.created,
        actor: ATTACHMENT_REF_ACTOR.user,
      },
      {
        attachment_id: 'hidden',
        version: 1,
        operation: ATTACHMENT_REF_OPERATION.created,
        actor: ATTACHMENT_REF_ACTOR.user,
      },
    ];

    render(
      <RoundAttachmentReferences
        attachmentRefs={attachmentRefs}
        conversationAttachments={conversationAttachments}
      />
    );

    const pills = screen.getAllByTestId('attachment-pill');
    expect(pills).toHaveLength(1);
    expect(screen.getByText('visible:created')).toBeInTheDocument();
  });

  it('infers operation from version when operation is missing', () => {
    const conversationAttachments: VersionedAttachment[] = [
      {
        id: 'att-v2',
        type: 'text',
        versions: [
          {
            version: 1,
            data: 'v1',
            created_at: '2024-01-01T00:00:00.000Z',
            content_hash: 'hash-1',
          },
          {
            version: 2,
            data: 'v2',
            created_at: '2024-01-02T00:00:00.000Z',
            content_hash: 'hash-2',
          },
        ],
        current_version: 2,
        active: true,
      },
    ];
    const attachmentRefs: AttachmentVersionRef[] = [
      {
        attachment_id: 'att-v2',
        version: 2,
        actor: ATTACHMENT_REF_ACTOR.user,
      },
    ];

    render(
      <RoundAttachmentReferences
        attachmentRefs={attachmentRefs}
        conversationAttachments={conversationAttachments}
      />
    );

    expect(screen.getByText('att-v2:updated')).toBeInTheDocument();
  });

  it('returns null when refs do not match available attachments', () => {
    const conversationAttachments = [createVersionedAttachment('att-1')];
    const attachmentRefs: AttachmentVersionRef[] = [
      {
        attachment_id: 'missing',
        version: 1,
        operation: ATTACHMENT_REF_OPERATION.created,
        actor: ATTACHMENT_REF_ACTOR.user,
      },
    ];

    const { container } = render(
      <RoundAttachmentReferences
        attachmentRefs={attachmentRefs}
        conversationAttachments={conversationAttachments}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
