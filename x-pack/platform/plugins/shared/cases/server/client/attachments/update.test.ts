/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment, actionComment, mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import {
  MAX_COMMENT_LENGTH,
  MAX_USER_ACTIONS_PER_CASE,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { update } from './update';
import {
  createAttachmentServiceMock,
  createCaseServiceMock,
  createUserActionServiceMock,
} from '../../services/mocks';
import { commentAttachmentType } from '../../attachment_framework/attachments';
import { getCaseOwner } from './utils';

jest.mock('./utils', () => ({
  getCaseOwner: jest.fn(),
}));

describe('update', () => {
  const caseID = 'test-case';

  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();
  const caseService = createCaseServiceMock();
  const attachmentService = createAttachmentServiceMock();

  clientArgs.services.userActionService = userActionService;
  clientArgs.services.caseService = caseService;
  clientArgs.services.attachmentService = attachmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCaseOwner).mockResolvedValue(SECURITY_SOLUTION_OWNER);
  });

  describe('comments', () => {
    const updateComment = { ...comment, id: 'comment-id', version: 'WzAsMV0=' };
    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        update({ updateRequest: { ...updateComment, comment: longComment }, caseID }, clientArgs)
      ).rejects.toThrow(
        `Failed to patch comment case id: test-case: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        update({ updateRequest: { ...updateComment, comment: '' }, caseID }, clientArgs)
      ).rejects.toThrow(
        'Failed to patch comment case id: test-case: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        update({ updateRequest: { ...updateComment, comment: '  ' }, caseID }, clientArgs)
      ).rejects.toThrow(
        'Failed to patch comment case id: test-case: Error: The comment field cannot be an empty string.'
      );
    });

    it(`throws error when the case user actions become > ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
      userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
        [caseID]: MAX_USER_ACTIONS_PER_CASE,
      });

      await expect(
        update({ updateRequest: { ...updateComment }, caseID }, clientArgs)
      ).rejects.toThrow(
        `The case with id ${caseID} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
      );
    });
  });

  describe('actions', () => {
    const updateActionComment = { ...actionComment, id: 'comment-id', version: 'WzAsMV0=' };

    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        update(
          { updateRequest: { ...updateActionComment, comment: longComment }, caseID },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to patch comment case id: test-case: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        update({ updateRequest: { ...updateActionComment, comment: '' }, caseID }, clientArgs)
      ).rejects.toThrow(
        'Failed to patch comment case id: test-case: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        update({ updateRequest: { ...updateActionComment, comment: '  ' }, caseID }, clientArgs)
      ).rejects.toThrow(
        'Failed to patch comment case id: test-case: Error: The comment field cannot be an empty string.'
      );
    });
  });

  it('accepts unified type (v2) update request without owner and uses case owner', async () => {
    clientArgs.unifiedAttachmentTypeRegistry.register(commentAttachmentType);
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseID]: 0 });

    const theCase = { ...mockCases[0], id: caseID };
    const commentId = 'comment-id';
    const existingComment = {
      id: commentId,
      type: 'cases-comments',
      version: 'WzAsMV0=',
      attributes: {
        type: 'comment',
        data: { content: 'existing' },
        created_at: '2024-01-01T00:00:00.000Z',
        created_by: { username: 'u', full_name: null, email: null },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
        owner: SECURITY_SOLUTION_OWNER,
      },
      references: [{ type: 'cases', id: caseID, name: `associated-cases` }],
    };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.patchCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [],
      total: 1,
      per_page: 1,
      page: 1,
    });
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseID, { alerts: 0, userComments: 1, events: 0 }]])
    );
    attachmentService.getter.get.mockResolvedValue(
      existingComment as unknown as Awaited<ReturnType<typeof attachmentService.getter.get>>
    );
    attachmentService.update.mockResolvedValue({
      ...existingComment,
      attributes: { ...existingComment.attributes, data: { content: 'updated content' } },
    });

    const unifiedUpdateRequest = {
      id: commentId,
      version: 'WzAsMV0=',
      type: 'comment' as const,
      data: { content: 'updated content' },
    };

    await expect(
      update({ updateRequest: unifiedUpdateRequest, caseID }, clientArgs)
    ).resolves.toBeDefined();

    expect(getCaseOwner).toHaveBeenCalledWith(caseID, clientArgs);
    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({ owner: SECURITY_SOLUTION_OWNER }),
        ]),
      })
    );
  });
});
