/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Operations } from '../../authorization';
import { mockCaseComments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { deleteComment, deleteAll } from './delete';
import { toAttachmentForDeletion } from './test_utils/deletion';
import { deleteRelatedAttachments } from './delete_utils';

jest.mock('./delete_utils', () => ({
  ...jest.requireActual('./delete_utils'),
  deleteRelatedAttachments: jest.fn(),
}));

describe('delete', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.resetAllMocks();

    clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map()
    );
    clientArgs.services.attachmentService.bulkDelete.mockImplementation(
      async ({ savedObjectIds }) => savedObjectIds
    );
  });

  describe('deleteComment', () => {
    beforeEach(() => {
      clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([
        toAttachmentForDeletion(mockCaseComments[0], 'mock-id-1'),
      ]);
    });

    it('reads the attachment in both saved object types and deletes it', async () => {
      await deleteComment({ caseID: 'mock-id-1', savedObjectId: 'mock-comment-1' }, clientArgs);

      expect(clientArgs.services.attachmentService.getter.bulkGetForDeletion).toHaveBeenCalledWith([
        'mock-comment-1',
      ]);
      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['mock-comment-1'],
        refresh: true,
      });
    });

    it('authorizes with the delete comment operation', async () => {
      await deleteComment({ caseID: 'mock-id-1', savedObjectId: 'mock-comment-1' }, clientArgs);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({ operation: Operations.deleteComment })
      );
    });

    it('throws a not found error when the attachment does not exist', async () => {
      clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([]);

      await expect(
        deleteComment({ caseID: 'mock-id-1', savedObjectId: 'missing-id' }, clientArgs)
      ).rejects.toThrow(
        'Failed to delete comment: mock-id-1 comment id: missing-id: Error: This comment missing-id does not exist anymore.'
      );

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
    });

    it('throws a not found error when the attachment belongs to another case', async () => {
      await expect(
        deleteComment({ caseID: 'other-case', savedObjectId: 'mock-comment-1' }, clientArgs)
      ).rejects.toThrow(/This comment mock-comment-1 does not exist in other-case\./);

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
      expect(deleteRelatedAttachments).not.toHaveBeenCalled();
    });

    it('removes the related attachments before deleting the attachment', async () => {
      await deleteComment({ caseID: 'mock-id-1', savedObjectId: 'mock-comment-1' }, clientArgs);

      expect(deleteRelatedAttachments).toHaveBeenCalledWith(
        { caseId: 'mock-id-1', attachments: [expect.objectContaining({ id: 'mock-comment-1' })] },
        clientArgs
      );
      expect(jest.mocked(deleteRelatedAttachments).mock.invocationCallOrder[0]).toBeLessThan(
        clientArgs.services.attachmentService.bulkDelete.mock.invocationCallOrder[0]
      );
    });

    it('deletes nothing when removing the related attachments fails', async () => {
      jest.mocked(deleteRelatedAttachments).mockRejectedValue(new Error('related failed'));

      await expect(
        deleteComment({ caseID: 'mock-id-1', savedObjectId: 'mock-comment-1' }, clientArgs)
      ).rejects.toThrow('related failed');

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
    });

    describe('attachmentsDeleted event', () => {
      it('emits the event with the alert references of the deleted alert attachment', async () => {
        clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([
          toAttachmentForDeletion(mockCaseComments[3], 'mock-id-4'),
        ]);

        await deleteComment({ caseID: 'mock-id-4', savedObjectId: 'mock-comment-4' }, clientArgs);

        expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledTimes(1);
        expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
          clientArgs.request,
          {
            caseId: 'mock-id-4',
            ids: ['mock-comment-4'],
            attachmentType: 'alert',
            owner: 'securitySolution',
            alertIds: ['test-id'],
            alertIndices: ['test-index'],
          }
        );
      });

      it('emits the event without alert references for a comment attachment', async () => {
        await deleteComment({ caseID: 'mock-id-1', savedObjectId: 'mock-comment-1' }, clientArgs);

        expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
          clientArgs.request,
          {
            caseId: 'mock-id-1',
            ids: ['mock-comment-1'],
            attachmentType: 'user',
            owner: 'securitySolution',
          }
        );
      });
    });
  });

  describe('deleteAll', () => {
    const attachments = mockCaseComments.map((so) => toAttachmentForDeletion(so, 'mock-id-1'));

    beforeEach(() => {
      clientArgs.services.attachmentService.getter.getAttachmentIdsForCases.mockResolvedValue(
        attachments.map(({ id, type }) => ({ id, type }))
      );
      clientArgs.services.attachmentService.getter.bulkGetForDeletionByType.mockResolvedValue(
        attachments
      );
    });

    it('reads every attachment of the case by its saved object type and deletes them', async () => {
      await deleteAll({ caseID: 'mock-id-1' }, clientArgs);

      expect(
        clientArgs.services.attachmentService.getter.getAttachmentIdsForCases
      ).toHaveBeenCalledWith({ caseIds: ['mock-id-1'] });
      expect(
        clientArgs.services.attachmentService.getter.bulkGetForDeletionByType
      ).toHaveBeenCalledWith(attachments.map(({ id, type }) => ({ id, type })));
      expect(
        clientArgs.services.attachmentService.getter.bulkGetForDeletion
      ).not.toHaveBeenCalled();
      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: attachments.map(({ id }) => id),
        refresh: true,
      });
    });

    it('authorizes with the delete all comments operation', async () => {
      await deleteAll({ caseID: 'mock-id-1' }, clientArgs);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({ operation: Operations.deleteAllComments })
      );
    });

    it('throws a not found error when the case has no attachments', async () => {
      clientArgs.services.attachmentService.getter.bulkGetForDeletionByType.mockResolvedValue([]);

      await expect(deleteAll({ caseID: 'mock-id-1' }, clientArgs)).rejects.toThrow(
        'Failed to delete all comments case id: mock-id-1: Error: No comments found for mock-id-1.'
      );

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
    });

    it('throws a not found error when an attachment no longer references the case', async () => {
      clientArgs.services.attachmentService.getter.bulkGetForDeletionByType.mockResolvedValue([
        attachments[0],
        toAttachmentForDeletion(mockCaseComments[1], 'other-case'),
      ]);

      await expect(deleteAll({ caseID: 'mock-id-1' }, clientArgs)).rejects.toThrow(
        /Attachment mock-comment-2 does not exist on case mock-id-1\./
      );

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
    });
  });
});
