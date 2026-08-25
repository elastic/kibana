/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_USER_ACTIONS_PER_CASE, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { createUserActionServiceMock } from '../../services/mocks';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { preflightWorkflowExecution, recordWorkflowExecution } from './record_workflow_execution';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';

const CASE_ID = 'test-case-1';
const OWNER = SECURITY_SOLUTION_OWNER;

const WORKFLOW_PAYLOAD = {
  id: 'wf-123',
  name: 'My Workflow',
  executionId: 'exec-abc',
};

const CASE_ORIGIN = { type: CASE_WORKFLOW_ORIGIN_TYPE, id: CASE_ID };

const caseSO = {
  ...mockCases[0],
  id: CASE_ID,
  attributes: { ...mockCases[0].attributes, owner: OWNER },
};

describe('preflightWorkflowExecution', () => {
  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();
  clientArgs.services.userActionService = userActionService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves without error when below the user action limit', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [CASE_ID]: MAX_USER_ACTIONS_PER_CASE - 1,
    });

    await expect(
      preflightWorkflowExecution({ caseId: CASE_ID }, clientArgs)
    ).resolves.toBeUndefined();

    expect(userActionService.getMultipleCasesUserActionsTotal).toHaveBeenCalledWith({
      caseIds: [CASE_ID],
    });
  });

  it('throws when the case has reached MAX_USER_ACTIONS_PER_CASE', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [CASE_ID]: MAX_USER_ACTIONS_PER_CASE,
    });

    await expect(preflightWorkflowExecution({ caseId: CASE_ID }, clientArgs)).rejects.toThrow(
      /limit of \d+ user actions/
    );
  });
});

describe('recordWorkflowExecution', () => {
  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();
  clientArgs.services.userActionService = userActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.services.caseService.getCase.mockResolvedValue(caseSO);
    clientArgs.authorization.ensureAuthorized.mockResolvedValue();
    userActionService.creator.createUserAction.mockResolvedValue(undefined as never);
  });

  it('fetches the case owner from the SO and authorizes with it', async () => {
    await recordWorkflowExecution(
      { caseId: CASE_ID, workflow: WORKFLOW_PAYLOAD, origin: CASE_ORIGIN },
      clientArgs
    );

    expect(clientArgs.services.caseService.getCase).toHaveBeenCalledWith({ id: CASE_ID });
    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: [{ id: CASE_ID, owner: OWNER }],
      })
    );
  });

  it('uses the workflow access operation, not the case-update operation', async () => {
    await recordWorkflowExecution(
      { caseId: CASE_ID, workflow: WORKFLOW_PAYLOAD, origin: CASE_ORIGIN },
      clientArgs
    );

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: expect.objectContaining({
          action: 'case_workflow_run_authz',
          ecsType: 'access',
        }),
      })
    );
  });

  it('calls createUserAction with the correct payload and refresh', async () => {
    const alertOrigin = { type: ALERT_WORKFLOW_ORIGIN_TYPE, id: 'alert-1', index: '.my-index' };

    await recordWorkflowExecution(
      { caseId: CASE_ID, workflow: WORKFLOW_PAYLOAD, origin: alertOrigin },
      clientArgs
    );

    expect(userActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: {
        type: UserActionTypes.workflow,
        action: UserActionActions.create,
        caseId: CASE_ID,
        owner: OWNER,
        user: clientArgs.user,
        payload: {
          workflow: WORKFLOW_PAYLOAD,
          origin: alertOrigin,
        },
      },
      refresh: 'wait_for',
    });
  });

  it('propagates an authorization rejection', async () => {
    clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Forbidden'));

    await expect(
      recordWorkflowExecution(
        { caseId: CASE_ID, workflow: WORKFLOW_PAYLOAD, origin: CASE_ORIGIN },
        clientArgs
      )
    ).rejects.toThrow('Failed to record workflow execution');
  });

  it('propagates a createUserAction rejection', async () => {
    userActionService.creator.createUserAction.mockRejectedValue(new Error('ES write failed'));

    await expect(
      recordWorkflowExecution(
        { caseId: CASE_ID, workflow: WORKFLOW_PAYLOAD, origin: CASE_ORIGIN },
        clientArgs
      )
    ).rejects.toThrow('Failed to record workflow execution');
  });
});
