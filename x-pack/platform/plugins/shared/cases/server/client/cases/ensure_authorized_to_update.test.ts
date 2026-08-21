/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WriteOperations } from '../../authorization';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { ensureAuthorizedToUpdate } from './ensure_authorized_to_update';

describe('ensureAuthorizedToUpdate', () => {
  const clientArgs = createCasesClientMockArgs();
  const theCase = mockCases[0];

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.services.caseService.getCase.mockResolvedValue(theCase);
  });

  it('authorizes using the updateCase privilege (cases:<owner>/updateCase) with a workflow-run audit action', async () => {
    await ensureAuthorizedToUpdate({ id: theCase.id }, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      // The operation reuses WriteOperations.UpdateCase as the privilege name so the
      // cases:<owner>/updateCase privilege string controls access, but overrides the audit
      // action to `case_workflow_run_authz` (access, not change) to avoid writing a
      // misleading "case updated" audit record when no mutation occurs.
      operation: expect.objectContaining({
        name: WriteOperations.UpdateCase,
        action: 'case_workflow_run_authz',
        ecsType: 'access',
        savedObjectType: CASE_SAVED_OBJECT,
      }),
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });
  });

  it('propagates authorization failures', async () => {
    clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('not authorized'));

    await expect(ensureAuthorizedToUpdate({ id: theCase.id }, clientArgs)).rejects.toThrow(
      'not authorized'
    );
  });
});
