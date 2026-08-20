/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Operations } from '../../authorization';
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

  it('authorizes the update operation against the stored case owner', async () => {
    await ensureAuthorizedToUpdate({ id: theCase.id }, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.updateCase,
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
