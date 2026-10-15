/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  createAttachmentStateManagerMock,
  createAttachmentsService,
} from '../../../../test_utils/runner';
import { createImageResolver } from './image_resolver';

describe('createImageResolver', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();

  const setup = () => {
    const attachmentStateManager = createAttachmentStateManagerMock();
    const attachments = createAttachmentsService();
    const imageResolver = createImageResolver({
      attachmentStateManager,
      attachments,
      request,
      spaceId: 'default',
      logger,
    });
    return { attachmentStateManager, attachments, imageResolver };
  };

  it('memoizes image resolution so the files plugin is only fetched once per attachment', async () => {
    const { attachmentStateManager, attachments, imageResolver } = setup();

    const getBase64 = jest.fn().mockResolvedValue('AAA');
    attachmentStateManager.get.mockReturnValue({
      id: 'img-1',
      version: 1,
      type: 'image',
      data: { data: { mime_type: 'image/png' } },
    } as any);
    attachments.getTypeDefinition.mockReturnValue({
      id: 'image',
      isReadonly: true,
      validate: jest.fn(),
      format: jest.fn().mockResolvedValue({
        getRepresentation: () => ({
          type: 'image',
          mimeType: 'image/png',
          getBase64,
        }),
      }),
      getTools: jest.fn(),
    } as any);

    const first = await imageResolver({ attachmentId: 'img-1' });
    const second = await imageResolver({ attachmentId: 'img-1' });

    expect(getBase64).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ base64: 'AAA', mimeType: 'image/png' });
    expect(second).toEqual({ base64: 'AAA', mimeType: 'image/png' });
  });

  it('returns undefined and caches the miss when the attachment is not found', async () => {
    const { attachmentStateManager, attachments, imageResolver } = setup();

    attachmentStateManager.get.mockReturnValue(undefined);

    const first = await imageResolver({ attachmentId: 'missing' });
    const second = await imageResolver({ attachmentId: 'missing' });

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    // the null result (attachment not found) is memoized too, so the second call
    // never re-queries the attachment state manager.
    expect(attachmentStateManager.get).toHaveBeenCalledTimes(1);
    expect(attachments.getTypeDefinition).not.toHaveBeenCalled();
  });

  it('treats different versions of the same attachment as separate cache entries', async () => {
    const { attachmentStateManager, attachments, imageResolver } = setup();

    const getBase64 = jest.fn().mockResolvedValue('AAA');
    attachmentStateManager.get.mockReturnValue({
      id: 'img-1',
      version: 1,
      type: 'image',
      data: { data: { mime_type: 'image/png' } },
    } as any);
    attachments.getTypeDefinition.mockReturnValue({
      id: 'image',
      isReadonly: true,
      validate: jest.fn(),
      format: jest.fn().mockResolvedValue({
        getRepresentation: () => ({ type: 'image', mimeType: 'image/png', getBase64 }),
      }),
      getTools: jest.fn(),
    } as any);

    await imageResolver({ attachmentId: 'img-1', version: 1 });
    await imageResolver({ attachmentId: 'img-1', version: 2 });

    expect(attachmentStateManager.get).toHaveBeenCalledTimes(2);
    expect(getBase64).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when the representation is not an image', async () => {
    const { attachmentStateManager, attachments, imageResolver } = setup();

    attachmentStateManager.get.mockReturnValue({
      id: 'text-1',
      version: 1,
      type: 'text',
      data: { data: {} },
    } as any);
    attachments.getTypeDefinition.mockReturnValue({
      id: 'text',
      isReadonly: true,
      validate: jest.fn(),
      format: jest.fn().mockResolvedValue({
        getRepresentation: () => ({ type: 'text', value: 'hello' }),
      }),
      getTools: jest.fn(),
    } as any);

    const result = await imageResolver({ attachmentId: 'text-1' });

    expect(result).toBeUndefined();
  });

  it('returns undefined and does not throw when format() rejects', async () => {
    const { attachmentStateManager, attachments, imageResolver } = setup();

    attachmentStateManager.get.mockReturnValue({
      id: 'img-1',
      version: 1,
      type: 'image',
      data: { data: { mime_type: 'image/png' } },
    } as any);
    attachments.getTypeDefinition.mockReturnValue({
      id: 'image',
      isReadonly: true,
      validate: jest.fn(),
      format: jest.fn().mockRejectedValue(new Error('boom')),
      getTools: jest.fn(),
    } as any);

    const result = await imageResolver({ attachmentId: 'img-1' });

    expect(result).toBeUndefined();
  });
});
