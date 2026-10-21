/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createCasesClientMock } from '../../../client/mocks';
import type { CaseError } from '../../../common/error';
import { mockCaseUnifiedAttachments } from '../../../mocks';
import { putAttachmentRoute } from './put_attachment';

type HandlerArgs = Parameters<typeof putAttachmentRoute.handler>[0];

describe('putAttachmentRoute', () => {
  const casesClientMock = createCasesClientMock();
  const response = { ok: jest.fn() };
  const context = { cases: { getCasesClient: jest.fn().mockResolvedValue(casesClientMock) } };
  const [attachmentSO] = mockCaseUnifiedAttachments;
  const request = {
    params: { case_id: 'case-1', id: attachmentSO.id },
    body: {
      type: 'comment',
      data: { content: 'updated' },
      owner: 'securitySolution',
      version: '1',
    },
  };

  const callHandler = (body: object = request.body) =>
    putAttachmentRoute.handler({
      context,
      request: { ...request, body },
      response,
    } as unknown as HandlerArgs);

  const getHandlerError = (body?: object) =>
    callHandler(body).then(
      () => {
        throw new Error('Expected the handler to throw');
      },
      (caseError: CaseError) => caseError
    );

  afterEach(() => jest.clearAllMocks());

  it('returns the replaced attachment', async () => {
    const attachment = { id: attachmentSO.id, version: '2', ...attachmentSO.attributes };
    casesClientMock.attachments.update.mockResolvedValue(attachment as never);

    await callHandler();

    expect(casesClientMock.attachments.update).toHaveBeenCalledWith({
      caseID: 'case-1',
      updateRequest: { ...request.body, id: attachmentSO.id },
    });
    expect(response.ok).toHaveBeenCalledWith({ body: attachment });
  });

  it('rejects a file attachment with a 400 before calling the client', async () => {
    const error = await getHandlerError({
      type: 'file',
      attachmentId: 'file-1',
      owner: 'securitySolution',
      version: '1',
    });

    expect(error.boomify().output.statusCode).toBe(400);
    expect(casesClientMock.attachments.update).not.toHaveBeenCalled();
  });

  it('keeps the status code of a client error', async () => {
    casesClientMock.attachments.update.mockRejectedValue(Boom.conflict('stale version'));

    const error = await getHandlerError();

    expect(error.boomify().output.statusCode).toBe(409);
    expect(response.ok).not.toHaveBeenCalled();
  });
});
