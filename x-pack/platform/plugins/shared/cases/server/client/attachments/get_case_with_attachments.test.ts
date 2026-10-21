/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { Operations } from '../../authorization';
import { CaseCommentModel } from '../../common/models';
import { createCasesClientMockArgs } from '../mocks';
import { getCaseWithAttachments } from './get_case_with_attachments';

jest.mock('../../common/models');

const caseCommentModelCreate = CaseCommentModel.create as jest.MockedFunction<
  typeof CaseCommentModel.create
>;

describe('getCaseWithAttachments', () => {
  const caseId = 'case-1';
  const clientArgs = createCasesClientMockArgs();
  const encodedCase = { id: caseId, comments: [] };
  const encodeWithComments = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    encodeWithComments.mockResolvedValue(encodedCase);
    caseCommentModelCreate.mockResolvedValue({
      savedObject: { id: caseId, attributes: { owner: SECURITY_SOLUTION_OWNER } },
      encodeWithComments,
    } as unknown as CaseCommentModel);
  });

  it('returns the case encoded with all its attachments', async () => {
    const res = await getCaseWithAttachments({ caseId, writeOperation: 'create' }, clientArgs);

    expect(res).toBe(encodedCase);
    expect(encodeWithComments).toHaveBeenCalledTimes(1);
  });

  it('checks the create privilege after a create', async () => {
    await getCaseWithAttachments({ caseId, writeOperation: 'create' }, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.getCaseAfterCreateComment,
      entities: [{ owner: SECURITY_SOLUTION_OWNER, id: caseId }],
    });
  });

  it('checks the update privilege after an update', async () => {
    await getCaseWithAttachments({ caseId, writeOperation: 'update' }, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.getCaseAfterUpdateComment,
      entities: [{ owner: SECURITY_SOLUTION_OWNER, id: caseId }],
    });
  });

  it('does not read the attachments when the user is not authorized', async () => {
    clientArgs.authorization.ensureAuthorized.mockRejectedValueOnce(new Error('forbidden'));

    await expect(
      getCaseWithAttachments({ caseId, writeOperation: 'create' }, clientArgs)
    ).rejects.toThrow(`Failed to get case with attachments, case id: ${caseId}: Error: forbidden`);
    expect(encodeWithComments).not.toHaveBeenCalled();
  });
});
