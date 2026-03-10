/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment, actionComment, mockCases, mockCaseUnifiedAttachments } from '../../mocks';
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
import { getCaseOwner } from './utils';

jest.mock('./utils', () => ({
  getCaseOwner: jest.fn(),
}));

describe('bulkCreate', () => {
  const caseId = 'test-case';

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

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      bulkCreate({ attachments: [{ ...comment, foo: 'bar' }], caseId }, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
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
    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        bulkCreate({ attachments: [{ ...comment, comment: longComment }], caseId }, clientArgs)
      ).rejects.toThrow(
        `Failed while bulk creating attachment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...comment, comment: '' }], caseId }, clientArgs)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...comment, comment: '  ' }], caseId }, clientArgs)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });
  });

  describe('actions', () => {
    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        bulkCreate(
          { attachments: [{ ...actionComment, comment: longComment }], caseId },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed while bulk creating attachment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...actionComment, comment: '' }], caseId }, clientArgs)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...actionComment, comment: '  ' }], caseId }, clientArgs)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });
  });

  it('accepts unified type (v2) attachments without owner and uses case owner', async () => {
    clientArgs.unifiedAttachmentTypeRegistry.register(commentAttachmentType);
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
      { type: 'comment' as const, data: { content: 'first' } },
      { type: 'comment' as const, data: { content: 'second' } },
    ];

    await expect(
      bulkCreate({ attachments: unifiedAttachments, caseId }, clientArgs)
    ).resolves.toBeDefined();

    expect(getCaseOwner).toHaveBeenCalledWith(caseId, clientArgs);
    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({ owner: SECURITY_SOLUTION_OWNER }),
        ]),
      })
    );
  });
});
