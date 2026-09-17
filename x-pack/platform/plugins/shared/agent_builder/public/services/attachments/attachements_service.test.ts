/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { AttachmentsService } from './attachements_service';

describe('AttachmentsService HTTP methods', () => {
  const setup = () => {
    const http = httpServiceMock.createStartContract();
    const service = new AttachmentsService({ http });
    return { http, service };
  };

  it('list GETs the collection endpoint', async () => {
    const { http, service } = setup();
    http.get.mockResolvedValue({ results: [], total_token_estimate: 0 });
    const res = await service.list({ conversationId: 'c1' });
    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/c1/attachments'),
      expect.objectContaining({ query: { include_deleted: undefined } })
    );
    expect(res).toEqual({ results: [], total_token_estimate: 0 });
  });

  it('get GETs the single-attachment endpoint and unwraps `attachment`', async () => {
    const { http, service } = setup();
    http.get.mockResolvedValue({ attachment: { id: 'a1' } });
    const res = await service.get({ conversationId: 'c1', attachmentId: 'a1' });
    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/c1/attachments/a1')
    );
    expect(res).toEqual({ id: 'a1' });
  });

  it('create POSTs the body and unwraps `attachment`', async () => {
    const { http, service } = setup();
    http.post.mockResolvedValue({ attachment: { id: 'a1' } });
    const res = await service.create({
      conversationId: 'c1',
      type: 'text',
      data: { text: 'hi' },
    });
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/c1/attachments'),
      expect.objectContaining({
        body: JSON.stringify({ type: 'text', data: { text: 'hi' } }),
      })
    );
    expect(res).toEqual({ id: 'a1' });
  });

  it('update PUTs the body and unwraps `attachment`', async () => {
    const { http, service } = setup();
    http.put.mockResolvedValue({ attachment: { id: 'a1' }, new_version: 2 });
    const res = await service.update({
      conversationId: 'c1',
      attachmentId: 'a1',
      data: { text: 'x' },
    });
    expect(http.put).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/c1/attachments/a1'),
      expect.objectContaining({ body: JSON.stringify({ data: { text: 'x' } }) })
    );
    expect(res).toEqual({ id: 'a1' });
  });

  it('delete DELETEs with the permanent query flag', async () => {
    const { http, service } = setup();
    http.delete.mockResolvedValue({ success: true, permanent: true });
    await service.delete({ conversationId: 'c1', attachmentId: 'a1', permanent: true });
    expect(http.delete).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/c1/attachments/a1'),
      expect.objectContaining({ query: { permanent: true } })
    );
  });
});
