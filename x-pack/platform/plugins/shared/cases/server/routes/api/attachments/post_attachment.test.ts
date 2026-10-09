/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  it('returns the created attachment', async () => {
    casesClientMock.attachments.add.mockImplementation(
      async ({ id }) =>
        ({
          comments: [{ id, version: '1', ...attachmentSO.attributes }],
        } as never)
    );

    await callHandler();

    expect(response.created).toHaveBeenCalledWith({
      body: expect.objectContaining({ type: 'comment', data: { content: 'test' } }),
    });
  });

  it('throws a 500 when the created attachment is missing from the case', async () => {
    casesClientMock.attachments.add.mockResolvedValue({ comments: [] } as never);

    const error = await getHandlerError();

    expect(error.wrappedError?.message).toMatch(
      /^Failed to locate created attachment .+ on case case-1$/
    );
    expect(error.boomify().output.statusCode).toBe(500);
    expect(response.created).not.toHaveBeenCalled();
  });
});
