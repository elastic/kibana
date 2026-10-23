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
import { postAttachmentRoute } from './post_attachment';

type HandlerArgs = Parameters<typeof postAttachmentRoute.handler>[0];

describe('postAttachmentRoute', () => {
  const casesClientMock = createCasesClientMock();
  const response = { created: jest.fn() };
  const context = { cases: { getCasesClient: jest.fn().mockResolvedValue(casesClientMock) } };
  const [attachmentSO] = mockCaseUnifiedAttachments;
  const request = {
    params: { case_id: 'case-1' },
    body: { type: 'comment', data: { content: 'hello' }, owner: 'securitySolution' },
  };

  const callHandler = () =>
    postAttachmentRoute.handler({ context, request, response } as unknown as HandlerArgs);

  const getHandlerError = () =>
    callHandler().then(
      () => {
        throw new Error('Expected the handler to throw');
      },
      (caseError: CaseError) => caseError
    );

  afterEach(() => jest.clearAllMocks());

  it('returns the attachment from the client', async () => {
    const attachment = { id: attachmentSO.id, version: '1', ...attachmentSO.attributes };
    casesClientMock.attachments.add.mockResolvedValue(attachment as never);

    await callHandler();

    expect(casesClientMock.attachments.add).toHaveBeenCalledWith({
      caseId: 'case-1',
      comment: request.body,
    });
    expect(response.created).toHaveBeenCalledWith({ body: attachment });
  });

  it('keeps the status code of a client error', async () => {
    casesClientMock.attachments.add.mockRejectedValue(Boom.notFound('missing'));

    const error = await getHandlerError();

    expect(error.boomify().output.statusCode).toBe(404);
    expect(response.created).not.toHaveBeenCalled();
  });
});
