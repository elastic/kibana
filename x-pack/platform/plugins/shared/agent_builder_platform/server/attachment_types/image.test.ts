/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, type ImageAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { AgentFormattedAttachment } from '@kbn/agent-builder-server/attachments';
import { createImageAttachmentType } from './image';

const BLUE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const createAttachment = (
  data: ImageAttachmentData
): Attachment<AttachmentType.image, ImageAttachmentData> => ({
  id: 'test-attachment-id',
  type: AttachmentType.image,
  data,
});

const validData: ImageAttachmentData = {
  content: BLUE_PIXEL_PNG,
  mime_type: 'image/png',
  filename: 'screenshot.png',
};

const formatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

describe('image attachment type', () => {
  const imageType = createImageAttachmentType();

  describe('validate', () => {
    it('accepts a valid png data URL', () => {
      const result = imageType.validate(validData);
      expect(result).toEqual({ valid: true, data: validData });
    });

    it('accepts a valid jpeg data URL', () => {
      const data: ImageAttachmentData = {
        content: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        mime_type: 'image/jpeg',
      };
      const result = imageType.validate(data);
      expect(result).toEqual({ valid: true, data });
    });

    it('accepts data without a filename', () => {
      const { filename: _, ...data } = validData;
      const result = imageType.validate(data);
      expect(result).toEqual({ valid: true, data });
    });

    it('rejects content that is not a data URL', () => {
      const result = imageType.validate({ ...validData, content: 'https://example.com/img.png' });
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects unsupported mime types in the data URL', () => {
      const result = imageType.validate({
        ...validData,
        content: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
      });
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects content exceeding the size cap', () => {
      const oversized = `data:image/png;base64,${'A'.repeat(3_000_001)}`;
      const result = imageType.validate({ ...validData, content: oversized });
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects data missing mime_type', () => {
      const { mime_type: _, ...data } = validData;
      const result = imageType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });
  });

  describe('format', () => {
    it('returns a text placeholder with filename and mime type, without the base64 content', () => {
      const attachment = createAttachment(validData);
      const formatted = imageType.format(attachment, formatContext) as AgentFormattedAttachment;
      const representation = formatted.getRepresentation!() as { type: string; value: string };

      expect(representation.type).toBe('text');
      expect(representation.value).toContain('"screenshot.png"');
      expect(representation.value).toContain('image/png');
      expect(representation.value).not.toContain('base64');
      expect(representation.value).not.toContain(validData.content.slice(-30));
    });

    it('returns a placeholder without filename when none is set', () => {
      const { filename: _, ...data } = validData;
      const attachment = createAttachment(data);
      const formatted = imageType.format(attachment, formatContext) as AgentFormattedAttachment;
      const representation = formatted.getRepresentation!() as { type: string; value: string };

      expect(representation.value).toContain('(image/png)');
      expect(representation.value).not.toContain('"');
    });
  });

  describe('getTools', () => {
    it('returns empty array', () => {
      expect(imageType.getTools!()).toEqual([]);
    });
  });

  describe('isReadonly', () => {
    it('is true', () => {
      expect(imageType.isReadonly).toBe(true);
    });
  });
});
