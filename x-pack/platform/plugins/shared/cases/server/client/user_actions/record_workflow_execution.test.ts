/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_USER_ACTIONS_PER_CASE } from '../../../common/constants';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { Operations } from '../../authorization';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { preflightWorkflowExecution, recordWorkflowExecution } from './record_workflow_execution';

const workflow = {
  id: 'workflow-1',
  name: 'Investigate case',
  executionId: 'execution-1',
};
const origin = {
  type: 'cases.observable' as const,
  id: 'observable-1',
};

describe('recordWorkflowExecution', () => {
  const clientArgs = createCasesClientMockArgs();
  const theCase = mockCases[0];

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.services.caseService.getCase.mockResolvedValue(theCase);
    clientArgs.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [theCase.id]: 0,
    });
  });

  it('authorizes the stored owner and records the requesting user as the caller', async () => {
    await recordWorkflowExecution({ caseId: theCase.id, workflow, origin }, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.updateCase,
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });
    expect(
      clientArgs.services.userActionService.getMultipleCasesUserActionsTotal
    ).toHaveBeenCalledWith({
      caseIds: [theCase.id],
    });
    expect(clientArgs.services.userActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: {
        action: UserActionActions.create,
        type: UserActionTypes.workflow,
        caseId: theCase.id,
        owner: theCase.attributes.owner,
        user: clientArgs.user,
        payload: { workflow, origin },
      },
    });
  });

  it('preflights authorization and capacity without creating activity', async () => {
    await preflightWorkflowExecution({ caseId: theCase.id }, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.updateCase,
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });
    expect(
      clientArgs.services.userActionService.getMultipleCasesUserActionsTotal
    ).toHaveBeenCalledWith({
      caseIds: [theCase.id],
    });
    expect(clientArgs.services.userActionService.creator.createUserAction).not.toHaveBeenCalled();
  });

  it(`rejects activity after ${MAX_USER_ACTIONS_PER_CASE} user actions`, async () => {
    clientArgs.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [theCase.id]: MAX_USER_ACTIONS_PER_CASE,
    });

    await expect(
      recordWorkflowExecution({ caseId: theCase.id, workflow, origin }, clientArgs)
    ).rejects.toThrow(
      `The case with id ${theCase.id} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
    );
    expect(clientArgs.services.userActionService.creator.createUserAction).not.toHaveBeenCalled();
  });
});
