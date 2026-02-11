/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../../common';
import { createCasesRoute } from '../create_cases_route';

import './get_alerts';

jest.mock('../create_cases_route', () => ({ createCasesRoute: jest.fn() }));

describe('GET alerts attached to case', () => {
  let routeHandler: Function;

  beforeEach(() => {
    routeHandler = jest.mocked(createCasesRoute).mock.calls[0][0].handler;
  });

  it('calls getAllDocumentsAttachedToCase with correct attachment types', async () => {
    const mockCaseId = 'test-case-id';
    const mockAlerts = {
      values: [
        { id: 'alert-1', index: 'alert-index-1' },
        { id: 'alert-2', index: 'alert-index-2' },
      ],
    };

    const mockGetAllDocumentsAttachedToCase = jest.fn().mockResolvedValue(mockAlerts);

    const mockContext = {
      cases: Promise.resolve({
        getCasesClient: jest.fn().mockResolvedValue({
          attachments: {
            getAllDocumentsAttachedToCase: mockGetAllDocumentsAttachedToCase,
          },
        }),
      }),
    };

    const mockRequest = {
      params: {
        case_id: mockCaseId,
      },
    };

    const mockResponse = {
      ok: jest.fn().mockReturnValue({ status: 200 }),
    };

    await routeHandler({ context: mockContext, request: mockRequest, response: mockResponse });

    expect(mockGetAllDocumentsAttachedToCase).toHaveBeenCalledWith({
      caseId: mockCaseId,
      attachmentTypes: [AttachmentType.alert],
    });

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: mockAlerts,
    });
  });
});
