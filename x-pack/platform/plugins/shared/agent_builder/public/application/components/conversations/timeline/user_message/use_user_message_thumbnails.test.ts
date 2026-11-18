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
import { useUserMessageThumbnails } from './use_user_message_thumbnails';

const THUMBNAIL_URL = 'data:image/png;base64,abc';

const mockGetAttachmentUiDefinition = jest.fn();
jest.mock('../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    attachmentsService: { getAttachmentUiDefinition: mockGetAttachmentUiDefinition },
  }),
}));

const makeImageVersioned = (id: string, name: string): VersionedAttachment => ({
  id,
  type: AttachmentType.image,
  versions: [
    {
      version: 1,
      data: { file_id: `file-${id}`, name, mime_type: 'image/png' },
      created_at: '2024-01-01T00:00:00Z',
      content_hash: 'x',
    },
  ],
  current_version: 1,
  active: true,
});

const userRef = (attachmentId: string): AttachmentVersionRef => ({
  attachment_id: attachmentId,
  version: 1,
  actor: ATTACHMENT_REF_ACTOR.user,
});

describe('useUserMessageThumbnails', () => {
  beforeEach(() => {
    mockGetAttachmentUiDefinition.mockReset();
    mockGetAttachmentUiDefinition.mockReturnValue({
      getLabel: () => 'photo.png',
      getThumbnail: () => THUMBNAIL_URL,
    });
  });

  it('returns no thumbnails when refs resolve to non-image types', () => {
    const nonImage: VersionedAttachment = {
      id: 'txt1',
      type: 'text' as AttachmentType,
      versions: [{ version: 1, data: {}, created_at: '2024-01-01T00:00:00Z', content_hash: 'x' }],
      current_version: 1,
      active: true,
    };
    const { result } = renderHook(() =>
      useUserMessageThumbnails({
        attachmentRefs: [userRef('txt1')],
        conversationAttachments: [nonImage],
      })
    );
    expect(result.current).toEqual([]);
  });

  it('returns a thumbnail with url, label and image name for each image ref', () => {
    mockGetAttachmentUiDefinition
      .mockReturnValueOnce({ getLabel: () => 'photo.png', getThumbnail: () => THUMBNAIL_URL })
      .mockReturnValueOnce({ getLabel: () => 'shot.png', getThumbnail: () => THUMBNAIL_URL });

    const { result } = renderHook(() =>
      useUserMessageThumbnails({
        attachmentRefs: [userRef('img1'), userRef('img2')],
        conversationAttachments: [
          makeImageVersioned('img1', 'photo.png'),
          makeImageVersioned('img2', 'shot.png'),
        ],
      })
    );

    expect(result.current).toEqual([
      {
        key: 'img1-v1',
        attachmentId: 'img1',
        thumbnailUrl: THUMBNAIL_URL,
        label: 'photo.png',
        name: 'photo.png',
      },
      {
        key: 'img2-v1',
        attachmentId: 'img2',
        thumbnailUrl: THUMBNAIL_URL,
        label: 'shot.png',
        name: 'shot.png',
      },
    ]);
  });

  it('skips images when getThumbnail returns undefined', () => {
    mockGetAttachmentUiDefinition.mockReturnValue({
      getLabel: () => 'photo.png',
      getThumbnail: () => undefined,
    });

    const { result } = renderHook(() =>
      useUserMessageThumbnails({
        attachmentRefs: [userRef('img1')],
        conversationAttachments: [makeImageVersioned('img1', 'photo.png')],
      })
    );

    expect(result.current).toEqual([]);
  });

  it('only returns images from the requested actors', () => {
    const { result } = renderHook(() =>
      useUserMessageThumbnails({
        attachmentRefs: [{ ...userRef('img1'), actor: ATTACHMENT_REF_ACTOR.agent }],
        conversationAttachments: [makeImageVersioned('img1', 'photo.png')],
        actorFilter: [ATTACHMENT_REF_ACTOR.user],
      })
    );

    expect(result.current).toEqual([]);
  });
});
