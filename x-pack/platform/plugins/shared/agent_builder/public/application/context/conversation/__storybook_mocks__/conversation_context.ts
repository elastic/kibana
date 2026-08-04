/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Storybook mock — attachment state is configurable per-story via __setMockAttachments.

import { AttachmentType } from '@kbn/agent-builder-common/attachments';

// 1×1 blue pixel PNG — enough for the thumbnail to render
export const BLUE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const MOCK_IMAGE_ATTACHMENT = {
  id: 'mock-img-1',
  type: AttachmentType.image,
  data: {
    content: BLUE_PIXEL_PNG,
    mime_type: 'image/png',
    filename: 'screenshot.png',
  },
  hidden: false,
};

let _attachments: typeof MOCK_IMAGE_ATTACHMENT[] = [MOCK_IMAGE_ATTACHMENT];

export const __setMockAttachments = (attachments: typeof _attachments) => {
  _attachments = attachments;
};

export const useConversationContext = () => ({
  conversationId: undefined as string | undefined,
  attachments: _attachments,
  upsertAttachments: undefined,
  removeAttachment: undefined,
  resetAttachments: undefined,
  initialMessage: undefined,
  autoSendInitialMessage: false,
  resetInitialMessage: undefined,
  isEmbeddedContext: false,
  conversationActions: {} as never,
});
