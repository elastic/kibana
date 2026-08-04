/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  IMAGE_ATTACHMENT_MAX_BASE64_LENGTH,
} from '@kbn/agent-builder-common/attachments';
import { createImageAttachmentType } from './image';

describe('createImageAttachmentType', () => {
  const imageType = createImageAttachmentType();

  it('registers as the image attachment type', () => {
    expect(imageType.id).toBe(AttachmentType.image);
    expect(imageType.isReadonly).toBe(true);
  });

  it('accepts valid image data', async () => {
    const result = await imageType.validate({
      media_type: 'image/png',
      data: 'abc123',
    });
    expect(result).toEqual({
      valid: true,
      data: { media_type: 'image/png', data: 'abc123' },
    });
  });

  it('rejects invalid media types', async () => {
    const result = await imageType.validate({
      media_type: 'image/gif',
      data: 'abc123',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects oversized payloads', async () => {
    const result = await imageType.validate({
      media_type: 'image/jpeg',
      data: 'a'.repeat(IMAGE_ATTACHMENT_MAX_BASE64_LENGTH + 1),
    });
    expect(result.valid).toBe(false);
  });

  it('formats as an image representation', async () => {
    const formatted = await imageType.format(
      {
        id: 'img-1',
        type: AttachmentType.image,
        data: { media_type: 'image/jpeg', data: 'xyz' },
      },
      { request: {} as any, spaceId: 'default' }
    );
    expect(await formatted.getRepresentation?.()).toEqual({
      type: 'image',
      mediaType: 'image/jpeg',
      data: 'xyz',
    });
  });
});
