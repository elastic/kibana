/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { countAttachmentsByType } from './count_by_type';

describe('countAttachmentsByType', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();
  const getCounts = clientArgs.services.attachmentService.getter
    .getUnifiedAttachmentCountsByType as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts the type on the visible cases, with zero for cases without any', async () => {
    casesClient.cases.bulkGet.mockResolvedValue({
      cases: [{ id: 'a' }, { id: 'b' }],
      errors: [],
    } as never);
    getCounts.mockResolvedValue(new Map([['a', 2]]));

    const res = await countAttachmentsByType(
      { caseIds: ['a', 'b', 'a'], attachmentType: 'agentic.investigation' },
      clientArgs,
      casesClient
    );

    expect(casesClient.cases.bulkGet).toHaveBeenCalledWith({ ids: ['a', 'b'] });
    expect(getCounts).toHaveBeenCalledWith({
      caseIds: ['a', 'b'],
      attachmentType: 'agentic.investigation',
    });
    expect(res).toEqual({ a: 2, b: 0 });
  });

  it('leaves out cases the caller cannot see, such as restricted cases they are not assigned to', async () => {
    casesClient.cases.bulkGet.mockResolvedValue({
      cases: [{ id: 'visible' }],
      errors: [{ caseId: 'hidden', status: 404, error: 'Not Found', message: 'not found' }],
    } as never);
    getCounts.mockResolvedValue(new Map([['visible', 1]]));

    const res = await countAttachmentsByType(
      { caseIds: ['visible', 'hidden'], attachmentType: 'agentic.investigation' },
      clientArgs,
      casesClient
    );

    expect(getCounts).toHaveBeenCalledWith({
      caseIds: ['visible'],
      attachmentType: 'agentic.investigation',
    });
    expect(res).toEqual({ visible: 1 });
  });
});
