/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  const callHandler = () =>
    putAttachmentRoute.handler({ context, request, response } as unknown as HandlerArgs);

  const getHandlerError = () =>
    callHandler().then(
      () => {
        throw new Error('Expected the handler to throw');
      },
      (caseError: CaseError) => caseError
    );

  afterEach(() => jest.clearAllMocks());

  it('returns the replaced attachment', async () => {
    casesClientMock.attachments.update.mockResolvedValue({
      comments: [{ id: attachmentSO.id, version: '2', ...attachmentSO.attributes }],
    } as never);

    await callHandler();

    expect(casesClientMock.attachments.update).toHaveBeenCalledWith({
      caseID: 'case-1',
      updateRequest: { ...request.body, id: attachmentSO.id },
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({ id: attachmentSO.id, type: 'comment' }),
    });
  });

  it('throws a 500 when the replaced attachment is missing from the case', async () => {
    casesClientMock.attachments.update.mockResolvedValue({ comments: [] } as never);

    const error = await getHandlerError();

    expect(error.wrappedError?.message).toBe(
      `Failed to locate replaced attachment ${attachmentSO.id} on case case-1`
    );
    expect(error.boomify().output.statusCode).toBe(500);
    expect(response.ok).not.toHaveBeenCalled();
  });
});
