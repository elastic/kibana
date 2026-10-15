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
import { deleteRelatedAttachments } from './bulk_delete';

jest.mock('./bulk_delete', () => ({ deleteRelatedAttachments: jest.fn() }));

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
    describe('attachmentsDeleted event', () => {
      it('emits the event with the alert references of the deleted alert attachment', async () => {
        clientArgs.services.attachmentService.getter.get.mockResolvedValue(mockCaseComments[3]);

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
      const { emitAttachmentsDeleted } = clientArgs.casesEventBus;
      expect(emitAttachmentsDeleted).toHaveBeenCalledTimes(3);
      expect(emitAttachmentsDeleted).toHaveBeenCalledWith(clientArgs.request, {
        caseId: 'mock-id-1',
        ids: ['mock-comment-1', 'mock-comment-2', 'mock-comment-3'],
        attachmentType: 'user',
        owner: 'securitySolution',
      });
      expect(emitAttachmentsDeleted).toHaveBeenCalledWith(clientArgs.request, {
        caseId: 'mock-id-1',
        ids: ['mock-comment-4', 'mock-comment-5', 'mock-comment-6'],
        attachmentType: 'alert',
        owner: 'securitySolution',
        alertIds: ['test-id', 'test-id-2', 'test-id-3'],
        alertIndices: ['test-index', 'test-index-2', 'test-index-3'],
      });
      expect(emitAttachmentsDeleted).toHaveBeenCalledWith(clientArgs.request, {
        caseId: 'mock-id-1',
        ids: ['mock-comment-7'],
        attachmentType: 'persistableState',
        owner: 'cases',
      });
    });

    it('does not emit the event when the deletion fails', async () => {
      clientArgs.services.attachmentService.bulkDelete.mockRejectedValue(new Error('boom'));

      await expect(deleteAll({ caseID: 'mock-id-1' }, clientArgs)).rejects.toThrow();

      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).not.toHaveBeenCalled();
    });

    it('only emits the event for the attachments confirmed deleted', async () => {
      clientArgs.services.attachmentService.bulkDelete.mockResolvedValue([
        'mock-comment-1',
        'mock-comment-4',
      ]);

      await deleteAll({ caseID: 'mock-id-1' }, clientArgs);

      const { emitAttachmentsDeleted } = clientArgs.casesEventBus;
      expect(emitAttachmentsDeleted).toHaveBeenCalledTimes(2);
      expect(emitAttachmentsDeleted).toHaveBeenCalledWith(clientArgs.request, {
        caseId: 'mock-id-1',
        ids: ['mock-comment-1'],
        attachmentType: 'user',
        owner: 'securitySolution',
      });
      expect(emitAttachmentsDeleted).toHaveBeenCalledWith(clientArgs.request, {
        caseId: 'mock-id-1',
        ids: ['mock-comment-4'],
        attachmentType: 'alert',
        owner: 'securitySolution',
        alertIds: ['test-id'],
        alertIndices: ['test-index'],
      });
    });
  });

  describe('Alerts', () => {
    it('delete alerts correctly', async () => {
      await deleteAll({ caseID: 'mock-id-4' }, clientArgs);

      expect(clientArgs.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
        alerts: [
          { id: 'test-id', index: 'test-index' },
          { id: 'test-id-2', index: 'test-index-2' },
          { id: 'test-id-3', index: 'test-index-3' },
        ],
        caseId: 'mock-id-4',
      });
    });

    it('does not call the alert service when the attachment is not an alert', async () => {
      clientArgs.services.caseService.getAllCaseComments.mockResolvedValue({
        ...getAllCaseCommentsResponse,
        saved_objects: [{ ...mockCaseComments[0], score: 0 }],
      });
      await deleteAll({ caseID: 'mock-id-1' }, clientArgs);

      expect(clientArgs.services.alertsService.ensureAlertsAuthorized).not.toHaveBeenCalledWith();
      expect(clientArgs.services.alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalledWith();
    });
  });

  describe('Attachment stats', () => {
    it('updates attachment stats correctly', async () => {
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([
          [
            'mock-id-1',
            {
              userComments: 0,
              alerts: 0,
              events: 0,
            },
          ],
        ])
      );

      await deleteAll({ caseID: 'mock-id-1' }, clientArgs);

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.updatedAttributes.total_comments).toEqual(0);
      expect(args.updatedAttributes.total_alerts).toEqual(0);
      expect(args.updatedAttributes.updated_at).toBeDefined();
      expect(args.updatedAttributes.updated_by).toEqual({
        email: 'damaged_raccoon@elastic.co',
        full_name: 'Damaged Raccoon',
        profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        username: 'damaged_raccoon',
      });
    });
  });
});
