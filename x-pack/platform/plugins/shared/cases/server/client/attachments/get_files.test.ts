/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { Operations } from '../../authorization';
import { getFiles } from './get_files';

describe('getFiles', () => {
  const clientArgs = createCasesClientMockArgs();
  const theCase = mockCases[0];

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.services.caseService.getCase.mockResolvedValue(theCase);
    (clientArgs.fileService.find as jest.Mock).mockResolvedValue({
      files: [{ toJSON: () => ({ id: 'file-1' }) }],
      total: 1,
    });
  });

  it('authorizes the case before listing its files', async () => {
    const res = await getFiles({ caseId: theCase.id, page: 1, perPage: 10 }, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.getCase,
      entities: [expect.objectContaining({ id: theCase.id, owner: theCase.attributes.owner })],
    });
    expect(res).toEqual({ files: [{ id: 'file-1' }], total: 1 });
  });

  it('scopes the files query to the case id and owner file kind', async () => {
    await getFiles({ caseId: theCase.id, page: 2, perPage: 5, searchTerm: 'report' }, clientArgs);

    expect(clientArgs.fileService.find).toHaveBeenCalledWith({
      kind: 'securitySolutionFilesCases',
      page: 2,
      perPage: 5,
      name: '*report*',
      meta: { caseIds: [theCase.id] },
    });
  });

  it('does not list files when the case authorization fails', async () => {
    // failure scenario: a restricted case the caller may not see must not leak
    // its file names through this route
    clientArgs.authorization.ensureAuthorized.mockRejectedValue(Boom.notFound());

    await expect(
      getFiles({ caseId: theCase.id, page: 1, perPage: 10 }, clientArgs)
    ).rejects.toThrow();

    expect(clientArgs.fileService.find).not.toHaveBeenCalled();
  });
});
