/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR, AttachmentType } from '@kbn/agent-builder-common/attachments';
import { useUserMessageFiles } from './use_user_message_files';

const makeVersioned = (
  id: string,
  type: string,
  data: Record<string, unknown>
): VersionedAttachment => ({
  id,
  type,
  versions: [{ version: 1, data, created_at: '2024-01-01T00:00:00Z', content_hash: 'x' }],
  current_version: 1,
  active: true,
});

const userRef = (attachmentId: string): AttachmentVersionRef => ({
  attachment_id: attachmentId,
  version: 1,
  actor: ATTACHMENT_REF_ACTOR.user,
});

describe('useUserMessageFiles', () => {
  it('returns the name and mime type of each document ref', () => {
    const { result } = renderHook(() =>
      useUserMessageFiles({
        attachmentRefs: [userRef('doc1')],
        conversationAttachments: [
          makeVersioned('doc1', AttachmentType.binary, {
            file_id: 'f1',
            name: 'notes.md',
            mime_type: 'text/markdown',
            text: 'hi',
          }),
        ],
      })
    );

    expect(result.current).toEqual([
      { key: 'doc1-v1', attachmentId: 'doc1', name: 'notes.md', mimeType: 'text/markdown' },
    ]);
  });

  it('ignores refs that are not documents', () => {
    const { result } = renderHook(() =>
      useUserMessageFiles({
        attachmentRefs: [userRef('img1'), userRef('txt1')],
        conversationAttachments: [
          makeVersioned('img1', AttachmentType.image, { name: 'photo.png' }),
          makeVersioned('txt1', 'text', {}),
        ],
      })
    );

    expect(result.current).toEqual([]);
  });

  it('ignores documents that were not added by the user', () => {
    const { result } = renderHook(() =>
      useUserMessageFiles({
        attachmentRefs: [{ attachment_id: 'doc1', version: 1, actor: ATTACHMENT_REF_ACTOR.agent }],
        conversationAttachments: [
          makeVersioned('doc1', AttachmentType.binary, { name: 'notes.md' }),
        ],
        actorFilter: [ATTACHMENT_REF_ACTOR.user],
      })
    );

    expect(result.current).toEqual([]);
  });
});
