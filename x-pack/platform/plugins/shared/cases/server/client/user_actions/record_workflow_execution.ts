/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowUserAction } from '../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { Operations } from '../../authorization';
import { validateMaxUserActions } from '../../common/validators';
import type { CasesClientArgs } from '../types';

export interface RecordWorkflowExecutionParams {
  caseId: string;
  workflow: WorkflowUserAction['payload']['workflow'];
  origin: WorkflowUserAction['payload']['origin'];
}

export const recordWorkflowExecution = async (
  { caseId, workflow, origin }: RecordWorkflowExecutionParams,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    authorization,
    services: { caseService, userActionService },
    user,
  } = clientArgs;

  const theCase = await caseService.getCase({ id: caseId });

  await authorization.ensureAuthorized({
    operation: Operations.updateCase,
    entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
  });

  await validateMaxUserActions({
    caseId: theCase.id,
    userActionService,
    userActionsToAdd: 1,
  });

  await userActionService.creator.createUserAction({
    userAction: {
      action: UserActionActions.create,
      type: UserActionTypes.workflow,
      caseId: theCase.id,
      owner: theCase.attributes.owner,
      user,
      payload: { workflow, origin },
    },
  });
};
