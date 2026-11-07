/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { recordDecision, setPendingDecisions } from './decisions';

const theCase = { id: 'case-1', owner: 'securitySolution', title: 'Credential dumping' } as never;

describe('case decisions', () => {
  let casesClient: ReturnType<typeof createCasesClientMock>;
  let clientArgs: ReturnType<typeof createCasesClientMockArgs>;

  beforeEach(() => {
    casesClient = createCasesClientMock();
    clientArgs = createCasesClientMockArgs();
    casesClient.cases.get.mockResolvedValue(theCase);
    clientArgs.services.caseService.getCase.mockResolvedValue({
      id: 'case-1',
      version: 'v1',
      attributes: { pending_decisions: 2 },
    } as never);
  });

  it('records the decision as the caller and sets the pending decisions left', async () => {
    await recordDecision(
      {
        caseId: 'case-1',
        proposalId: 'p-1',
        title: 'Close 1 alert',
        outcome: 'approved',
        pendingDecisions: 1,
      },
      clientArgs,
      casesClient
    );

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: expect.objectContaining({ name: 'updateCase' }),
      entities: [{ id: 'case-1', owner: 'securitySolution' }],
    });
    expect(clientArgs.services.userActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: expect.objectContaining({
        type: 'decision',
        caseId: 'case-1',
        owner: 'securitySolution',
        user: clientArgs.user,
        payload: { decision: { proposal_id: 'p-1', title: 'Close 1 alert', outcome: 'approved' } },
      }),
    });
    expect(clientArgs.services.caseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case-1',
        version: 'v1',
        updatedAttributes: { pending_decisions: 1 },
      })
    );
  });

  it('sets the counter without a user action, and skips a write that changes nothing', async () => {
    await setPendingDecisions({ caseId: 'case-1', count: 3 }, clientArgs, casesClient);
    expect(clientArgs.services.caseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAttributes: { pending_decisions: 3 } })
    );
    expect(clientArgs.services.userActionService.creator.createUserAction).not.toHaveBeenCalled();

    clientArgs.services.caseService.patchCase.mockClear();
    await setPendingDecisions({ caseId: 'case-1', count: 2 }, clientArgs, casesClient);
    expect(clientArgs.services.caseService.patchCase).not.toHaveBeenCalled();
  });

  it('writes nothing on a case the caller cannot open (restricted, another owner)', async () => {
    casesClient.cases.get.mockRejectedValue(Boom.notFound('Case not found'));

    await expect(
      recordDecision(
        {
          caseId: 'case-1',
          proposalId: 'p-1',
          title: 'Close 1 alert',
          outcome: 'dismissed',
          pendingDecisions: 0,
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrow();
    await expect(
      setPendingDecisions({ caseId: 'case-1', count: 0 }, clientArgs, casesClient)
    ).rejects.toThrow();
    expect(clientArgs.services.userActionService.creator.createUserAction).not.toHaveBeenCalled();
    expect(clientArgs.services.caseService.patchCase).not.toHaveBeenCalled();
  });
});
