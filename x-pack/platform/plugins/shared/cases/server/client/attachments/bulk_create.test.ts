/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCases, mockCaseUnifiedAttachments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import {
  MAX_COMMENT_LENGTH,
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_USER_ACTIONS_PER_CASE,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { bulkCreate } from './bulk_create';
import {
  createAttachmentServiceMock,
  createCaseServiceMock,
  createUserActionServiceMock,
} from '../../services/mocks';
import { commentAttachmentType } from '../../attachment_framework/attachments';

describe('bulkCreate', () => {
  const caseId = 'test-case';

  const comment = {
    type: 'comment' as const,
    data: { content: 'a comment' },
    owner: SECURITY_SOLUTION_OWNER,
  };

  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();
  const caseService = createCaseServiceMock();
  const attachmentService = createAttachmentServiceMock();

  clientArgs.services.userActionService = userActionService;
  clientArgs.services.caseService = caseService;
  clientArgs.services.attachmentService = attachmentService;

  const registerCommentType = () => {
    if (!clientArgs.unifiedAttachmentTypeRegistry.has(commentAttachmentType.id)) {
      clientArgs.unifiedAttachmentTypeRegistry.register(commentAttachmentType);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      bulkCreate({ attachments: [{ ...comment, foo: 'bar' }], caseId }, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
  });

  it('rejects a legacy v1 body', async () => {
    const v1Comment = { type: 'user', comment: 'a legacy comment', owner: SECURITY_SOLUTION_OWNER };

    await expect(
      // @ts-expect-error: legacy v1 shape is no longer accepted, client is unified-only
      bulkCreate({ attachments: [v1Comment], caseId }, clientArgs)
    ).rejects.toThrow();
  });

  it(`throws error when attachments are more than ${MAX_BULK_CREATE_ATTACHMENTS}`, async () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(comment);

    await expect(bulkCreate({ attachments, caseId }, clientArgs)).rejects.toThrow(
      `The length of the field attachments is too long. Array must be of length <= ${MAX_BULK_CREATE_ATTACHMENTS}.`
    );
  });

  it(`throws error when the case user actions become > ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [caseId]: MAX_USER_ACTIONS_PER_CASE - 1,
    });

    await expect(
      bulkCreate({ attachments: [comment, comment], caseId }, clientArgs)
    ).rejects.toThrow(
      `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
    );
  });

  describe('comments', () => {
    beforeEach(() => {
      registerCommentType();
    });

    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        bulkCreate(
          { attachments: [{ ...comment, data: { content: longComment } }], caseId },
          clientArgs
        )
      ).rejects.toThrow(/Comment content exceeds maximum length/);
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...comment, data: { content: '' } }], caseId }, clientArgs)
      ).rejects.toThrow(/Comment content must be a non-empty string/);
    });

    it('should throw an error if the comment is a string with empty characters', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...comment, data: { content: '  ' } }], caseId }, clientArgs)
      ).rejects.toThrow(/Comment content must be a non-empty string/);
    });
  });

  it('accepts unified comments', async () => {
    registerCommentType();
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.patchCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [],
      total: 2,
      per_page: 2,
      page: 1,
    });
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
    );
    attachmentService.bulkCreate.mockResolvedValue({
      saved_objects: [
        mockCaseUnifiedAttachments[0],
        { ...mockCaseUnifiedAttachments[0], id: 'comment-2' },
      ],
    });

    const unifiedAttachments = [
      { type: 'comment' as const, data: { content: 'first' }, owner: SECURITY_SOLUTION_OWNER },
      { type: 'comment' as const, data: { content: 'second' }, owner: SECURITY_SOLUTION_OWNER },
    ];

    await expect(
      bulkCreate({ attachments: unifiedAttachments, caseId }, clientArgs)
    ).resolves.toBeDefined();

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({ owner: SECURITY_SOLUTION_OWNER }),
        ]),
      })
    );
  });

  it('emits attachmentAdded event per attachment after bulk creating', async () => {
    if (!clientArgs.unifiedAttachmentTypeRegistry.has(commentAttachmentType.id)) {
      clientArgs.unifiedAttachmentTypeRegistry.register(commentAttachmentType);
    }
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.patchCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [],
      total: 2,
      per_page: 2,
      page: 1,
    });
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
    );
    attachmentService.bulkCreate.mockResolvedValue({
      saved_objects: [
        mockCaseUnifiedAttachments[0],
        { ...mockCaseUnifiedAttachments[0], id: 'comment-2' },
      ],
    });

    const unifiedAttachments = [
      { type: 'comment' as const, data: { content: 'first' }, owner: SECURITY_SOLUTION_OWNER },
      { type: 'comment' as const, data: { content: 'second' }, owner: SECURITY_SOLUTION_OWNER },
    ];

    await bulkCreate({ attachments: unifiedAttachments, caseId }, clientArgs);

    expect(clientArgs.casesEventBus.emitAttachmentsAdded).toHaveBeenCalledTimes(1);
    expect(clientArgs.casesEventBus.emitAttachmentsAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        caseId,
        attachmentIds: expect.arrayContaining([expect.any(String), expect.any(String)]),
        attachmentType: 'comment',
        owner: SECURITY_SOLUTION_OWNER,
      })
    );
  });
});
