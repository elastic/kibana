/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_USER_ACTIONS_PER_CASE, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { mockCases, mockCaseUnifiedAttachments } from '../../mocks';
import {
  createAttachmentServiceMock,
  createCaseServiceMock,
  createUserActionServiceMock,
} from '../../services/mocks';
import { createCasesClientMockArgs } from '../mocks';
import { commentAttachmentType } from '../../attachment_framework/attachments';
import { addComment } from './add';

describe('addComment', () => {
  const caseId = 'test-case';
  const unifiedComment = {
    type: 'comment' as const,
    data: { content: 'unified text' },
    owner: SECURITY_SOLUTION_OWNER,
  };

  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();
  const caseService = createCaseServiceMock();
  const attachmentService = createAttachmentServiceMock();

  clientArgs.services.userActionService = userActionService;
  clientArgs.services.caseService = caseService;
  clientArgs.services.attachmentService = attachmentService;
  clientArgs.unifiedAttachmentTypeRegistry.register(commentAttachmentType);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      addComment({ comment: { ...unifiedComment, foo: 'bar' }, caseId }, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
  });

  it(`throws error when the case user actions become > ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [caseId]: MAX_USER_ACTIONS_PER_CASE,
    });

    await expect(addComment({ comment: unifiedComment, caseId }, clientArgs)).rejects.toThrow(
      `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
    );
  });

  it('accepts unified type (v2) request', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.patchCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [],
      total: 1,
      per_page: 1,
      page: 1,
    });
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
    );
    attachmentService.create.mockResolvedValue(mockCaseUnifiedAttachments[0]);

    await expect(
      addComment({ comment: unifiedComment, caseId }, clientArgs)
    ).resolves.toBeDefined();

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({ owner: SECURITY_SOLUTION_OWNER }),
        ]),
      })
    );
  });

  it('emits attachmentAdded event after creating a comment', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.patchCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [],
      total: 1,
      per_page: 1,
      page: 1,
    });
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
    );
    attachmentService.create.mockResolvedValue(mockCaseUnifiedAttachments[0]);

    await addComment({ comment: unifiedComment, caseId }, clientArgs);

    expect(clientArgs.casesEventBus.emitAttachmentsAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        caseId,
        attachmentIds: expect.any(Array),
        attachmentType: 'comment',
        owner: SECURITY_SOLUTION_OWNER,
      })
    );
  });
});
