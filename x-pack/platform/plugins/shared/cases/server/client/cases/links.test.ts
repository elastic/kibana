/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { getRelatedCases, linkCases, unlinkCase } from './links';

const theCase = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    title: `Case ${id}`,
    owner: 'securitySolution',
    incremental_id: Number(id.replace(/\D/g, '')) || null,
    status: 'open',
    status_key: null,
    updated_at: '2026-11-06T10:00:00.000Z',
    ...extra,
  } as never);

const link = (id: string, targetCaseId: string) => ({
  id,
  type: 'cases.case',
  attachmentId: targetCaseId,
  owner: 'securitySolution',
});

describe('case links', () => {
  let casesClient: ReturnType<typeof createCasesClientMock>;
  let clientArgs: ReturnType<typeof createCasesClientMockArgs>;

  beforeEach(() => {
    casesClient = createCasesClientMock();
    clientArgs = createCasesClientMockArgs();
    clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValue(new Set());
    casesClient.cases.get.mockImplementation(async ({ id }) => theCase(id));
    casesClient.attachments.find.mockResolvedValue({ data: [], total: 0 } as never);
  });

  it('links both ways and returns the linked case first', async () => {
    casesClient.cases.bulkGet.mockResolvedValue({
      cases: [theCase('case-2')],
      errors: [],
    } as never);
    casesClient.attachments.find.mockImplementation(async ({ caseID }) =>
      caseID === 'case-1' && casesClient.attachments.bulkCreate.mock.calls.length > 0
        ? ({ data: [link('a-1', 'case-2')], total: 1 } as never)
        : ({ data: [], total: 0 } as never)
    );

    const res = await linkCases(
      { caseId: 'case-1', request: { target_case_ids: ['case-2'] } },
      clientArgs as never,
      casesClient
    );

    expect(casesClient.attachments.bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachments: [expect.objectContaining({ type: 'cases.case', attachmentId: 'case-2' })],
    });
    expect(casesClient.attachments.bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-2',
      attachments: [expect.objectContaining({ type: 'cases.case', attachmentId: 'case-1' })],
    });
    expect(res.cases[0]).toEqual(expect.objectContaining({ id: 'case-2', reasons: ['linked'] }));
  });

  it("never links a case the user can't see", async () => {
    // bulkGet leaves out restricted cases the user isn't assigned to.
    casesClient.cases.bulkGet.mockResolvedValue({ cases: [], errors: [] } as never);

    await expect(
      linkCases(
        { caseId: 'case-1', request: { target_case_ids: ['hidden'] } },
        clientArgs as never,
        casesClient
      )
    ).rejects.toThrow("Case hidden was not found or you don't have access to it.");
    expect(casesClient.attachments.bulkCreate).not.toHaveBeenCalled();
  });

  it('refuses to link a case to itself', async () => {
    await expect(
      linkCases(
        { caseId: 'case-1', request: { target_case_ids: ['case-1'] } },
        clientArgs as never,
        casesClient
      )
    ).rejects.toThrow('A case cannot be linked to itself.');
  });

  it('unlinks both sides', async () => {
    casesClient.attachments.find.mockImplementation(async ({ caseID }) =>
      caseID === 'case-1'
        ? ({ data: [link('a-1', 'case-2')], total: 1 } as never)
        : ({ data: [link('b-1', 'case-1')], total: 1 } as never)
    );
    casesClient.cases.bulkGet.mockResolvedValue({
      cases: [theCase('case-2')],
      errors: [],
    } as never);

    await unlinkCase(
      { caseId: 'case-1', targetCaseId: 'case-2' },
      clientArgs as never,
      casesClient
    );

    expect(casesClient.attachments.delete).toHaveBeenCalledWith({
      caseID: 'case-1',
      savedObjectId: 'a-1',
    });
    expect(casesClient.attachments.delete).toHaveBeenCalledWith({
      caseID: 'case-2',
      savedObjectId: 'b-1',
    });
  });

  it('counts linked cases the viewer cannot see, without naming them', async () => {
    casesClient.attachments.find.mockResolvedValue({
      data: [link('a-1', 'case-2'), link('a-2', 'secret')],
      total: 2,
    } as never);
    casesClient.cases.bulkGet.mockResolvedValue({
      cases: [theCase('case-2')],
      errors: [],
    } as never);

    const res = await getRelatedCases({ caseId: 'case-1' }, clientArgs as never, casesClient);

    expect(res.cases.map(({ id }) => id)).toEqual(['case-2']);
    expect(res.inaccessible_linked_count).toBe(1);
  });

  it('adds cases that share an alert', async () => {
    clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValue(
      new Set(['alert-1'])
    );
    casesClient.cases.getCasesByAlertID.mockResolvedValue([
      { id: 'case-1' },
      { id: 'case-3' },
    ] as never);
    casesClient.cases.bulkGet.mockResolvedValue({
      cases: [theCase('case-3')],
      errors: [],
    } as never);

    const res = await getRelatedCases({ caseId: 'case-1' }, clientArgs as never, casesClient);

    expect(res.cases).toEqual([
      expect.objectContaining({ id: 'case-3', reasons: ['alert'], shared_alert_ids: ['alert-1'] }),
    ]);
  });
});
