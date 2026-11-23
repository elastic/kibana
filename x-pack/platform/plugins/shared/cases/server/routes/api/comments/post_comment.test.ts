/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesRoute } from '../create_cases_route';

import './post_comment';

jest.mock('../create_cases_route', () => ({ createCasesRoute: jest.fn() }));
jest.mock('../../../common/attachments', () => ({
  toUnifiedAttachmentRequest: jest.fn((body) => ({ ...body, type: `unified.${body.type}` })),
  toLegacyCaseResponse: jest.fn((theCase) => theCase),
}));

const routeHandler: Function = jest.mocked(createCasesRoute).mock.calls[0][0].handler;

describe('POST comment route', () => {
  const addAndGetCase = jest.fn();
  const incrementAttachmentTypeCounters = jest.fn();
  const response = { ok: jest.fn().mockReturnValue({ status: 200 }) };

  const context = {
    cases: Promise.resolve({
      getCasesClient: jest.fn().mockResolvedValue({ attachments: { addAndGetCase } }),
    }),
  };

  const post = (body: Record<string, unknown>) =>
    routeHandler({
      context,
      request: { params: { case_id: 'case-1' }, body },
      response,
      incrementAttachmentTypeCounters,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    addAndGetCase.mockResolvedValue({ id: 'case-1' });
  });

  it.each(['alert', 'event'])(
    'reports `%s` as sent on the attachmentsAdded trigger',
    async (type) => {
      await post({ type, owner: 'securitySolution' });

      expect(addAndGetCase).toHaveBeenCalledWith({
        caseId: 'case-1',
        comment: { type: `unified.${type}`, owner: 'securitySolution' },
        triggerAttachmentType: type,
      });
    }
  );

  it.each(['user', 'externalReference'])(
    'does not override the trigger attachment type for `%s`',
    async (type) => {
      await post({ type, owner: 'securitySolution' });

      expect(addAndGetCase).toHaveBeenCalledWith(
        expect.objectContaining({ triggerAttachmentType: undefined })
      );
    }
  );
});
