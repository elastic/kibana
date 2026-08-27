/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_USER_ACTIONS_PER_CASE, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../../client/mocks';
import { createUserActionServiceMock } from '../../services/mocks';
import { preflightWorkflowExecution, recordWorkflowExecution } from './record_workflow_execution';

const CASE_ID_A = 'test-case-a';
const CASE_ID_B = 'test-case-b';
const OWNER = SECURITY_SOLUTION_OWNER;

const WORKFLOW_PAYLOAD = {
  id: 'wf-123',
  name: 'My Workflow',
  executionId: 'exec-abc',
};

const CASE_ORIGIN = { type: CASE_WORKFLOW_ORIGIN_TYPE, id: CASE_ID_A };
const CASES = [
  { id: CASE_ID_A, owner: OWNER },
  { id: CASE_ID_B, owner: OWNER },
];

describe('preflightWorkflowExecution', () => {
  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();
  clientArgs.services.userActionService = userActionService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves without error when all cases are below the user action limit', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [CASE_ID_A]: MAX_USER_ACTIONS_PER_CASE - 1,
    });

    await expect(
      preflightWorkflowExecution({ caseIds: [CASE_ID_A] }, clientArgs)
    ).resolves.toBeUndefined();

    expect(userActionService.getMultipleCasesUserActionsTotal).toHaveBeenCalledWith({
      caseIds: [CASE_ID_A],
    });
  });

  it('issues a single bulk call for multiple cases', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [CASE_ID_A]: 0,
      [CASE_ID_B]: 0,
    });

    await preflightWorkflowExecution({ caseIds: [CASE_ID_A, CASE_ID_B] }, clientArgs);

    expect(userActionService.getMultipleCasesUserActionsTotal).toHaveBeenCalledTimes(1);
    expect(userActionService.getMultipleCasesUserActionsTotal).toHaveBeenCalledWith({
      caseIds: [CASE_ID_A, CASE_ID_B],
    });
  });

  it('throws when any case has reached MAX_USER_ACTIONS_PER_CASE', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [CASE_ID_A]: MAX_USER_ACTIONS_PER_CASE - 1,
      [CASE_ID_B]: MAX_USER_ACTIONS_PER_CASE,
    });

    await expect(
      preflightWorkflowExecution({ caseIds: [CASE_ID_A, CASE_ID_B] }, clientArgs)
    ).rejects.toThrow(/limit of \d+ user actions/);
  });
});

describe('recordWorkflowExecution', () => {
  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();
  clientArgs.services.userActionService = userActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    userActionService.creator.bulkCreateUserAction.mockResolvedValue(undefined as never);
  });

  it('does not fetch or authorize cases again', async () => {
    await recordWorkflowExecution(
      { cases: CASES, workflow: WORKFLOW_PAYLOAD, origin: CASE_ORIGIN },
      clientArgs
    );

    expect(clientArgs.services.caseService.getCases).not.toHaveBeenCalled();
    expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalled();
  });

  it('calls bulkCreateUserAction with one entry per case and wait_for refresh', async () => {
    const alertOrigin = { type: ALERT_WORKFLOW_ORIGIN_TYPE, id: 'alert-1', index: '.my-index' };

    await recordWorkflowExecution(
      { cases: CASES, workflow: WORKFLOW_PAYLOAD, origin: alertOrigin },
      clientArgs
    );

    expect(userActionService.creator.bulkCreateUserAction).toHaveBeenCalledWith({
      userActions: expect.arrayContaining([
        expect.objectContaining({
          type: UserActionTypes.workflow,
          action: UserActionActions.create,
          caseId: CASE_ID_A,
          owner: OWNER,
          payload: { workflow: WORKFLOW_PAYLOAD, origin: alertOrigin },
        }),
        expect.objectContaining({
          type: UserActionTypes.workflow,
          action: UserActionActions.create,
          caseId: CASE_ID_B,
          owner: OWNER,
          payload: { workflow: WORKFLOW_PAYLOAD, origin: alertOrigin },
        }),
      ]),
      refresh: 'wait_for',
    });
  });

  it('propagates a bulkCreateUserAction rejection', async () => {
    userActionService.creator.bulkCreateUserAction.mockRejectedValue(new Error('ES write failed'));

    await expect(
      recordWorkflowExecution(
        { cases: [CASES[0]], workflow: WORKFLOW_PAYLOAD, origin: CASE_ORIGIN },
        clientArgs
      )
    ).rejects.toThrow('Failed to record workflow execution');
  });
});
