/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment, actionComment } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { MAX_COMMENT_LENGTH, MAX_USER_ACTIONS_PER_CASE } from '../../../common/constants';
import { update } from './update';
import { createUserActionServiceMock } from '../../services/mocks';

describe('update', () => {
  const caseID = 'test-case';

  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();

  clientArgs.services.userActionService = userActionService;

  beforeEach(() => {
    jest.clearAllMocks();
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
});
