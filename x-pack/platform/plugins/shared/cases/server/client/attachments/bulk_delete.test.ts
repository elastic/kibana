/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { File } from '@kbn/files-plugin/common';
import { bulkDeleteAttachments, bulkDeleteFileAttachments } from './bulk_delete';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_BULK_DELETE_ATTACHMENTS,
  MAX_DELETE_FILES,
} from '../../../common/constants';
import { constructFileKindIdByOwner } from '../../../common/files';
import { Operations } from '../../authorization';
import type { AttachmentForDeletion } from '../../services/attachments/types';
import { mockCaseComments } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { commentFileExternalReference } from '../cases/mock';
import { toAttachmentForDeletion } from './test_utils/deletion';

describe('bulk_delete', () => {
  describe('bulkDeleteAttachments', () => {
    const clientArgs = createCasesClientMockArgs();
    const userComment = toAttachmentForDeletion(mockCaseComments[0]);
    const otherUserComment = toAttachmentForDeletion(mockCaseComments[1]);

    beforeEach(() => {
      jest.resetAllMocks();

      clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([
        userComment,
        otherUserComment,
      ]);
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map()
      );
      clientArgs.services.attachmentService.bulkDelete.mockImplementation(
        async ({ savedObjectIds }) => savedObjectIds
      );
    });

    it('deletes all the requested attachments in a single call and refreshes', async () => {
      await bulkDeleteAttachments(
        { caseId: 'mock-id-1', savedObjectIds: ['mock-comment-1', 'mock-comment-2'] },
        clientArgs
      );

      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['mock-comment-1', 'mock-comment-2'],
        refresh: true,
      });
    });

    it('deduplicates the requested ids', async () => {
      clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([
        userComment,
      ]);

      await bulkDeleteAttachments(
        { caseId: 'mock-id-1', savedObjectIds: ['mock-comment-1', 'mock-comment-1'] },
        clientArgs
      );

      expect(clientArgs.services.attachmentService.getter.bulkGetForDeletion).toHaveBeenCalledWith([
        'mock-comment-1',
      ]);
      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['mock-comment-1'],
        refresh: true,
      });
    });

    it('authorizes with the delete comment operation', async () => {
      await bulkDeleteAttachments(
        { caseId: 'mock-id-1', savedObjectIds: ['mock-comment-1', 'mock-comment-2'] },
        clientArgs
      );

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({ operation: Operations.deleteComment })
      );
    });

    describe('errors', () => {
      it(`throws when trying to delete more than ${MAX_BULK_DELETE_ATTACHMENTS} attachments at a time`, async () => {
        const savedObjectIds = new Array(MAX_BULK_DELETE_ATTACHMENTS + 1)
          .fill('id')
          .map((id, index) => `${id}-${index}`);

        await expect(
          bulkDeleteAttachments({ caseId: 'mock-id-1', savedObjectIds }, clientArgs)
        ).rejects.toThrow(
          `Failed to bulk delete attachments for case: mock-id-1: Error: The length of the field ids is too long. Array must be of length <= ${MAX_BULK_DELETE_ATTACHMENTS}`
        );
      });

      it('throws when the ids are empty', async () => {
        await expect(
          bulkDeleteAttachments({ caseId: 'mock-id-1', savedObjectIds: [] }, clientArgs)
        ).rejects.toThrow(
          'Failed to bulk delete attachments for case: mock-id-1: Error: The length of the field ids is too short. Array must be of length >= 1'
        );
      });

      it('throws a not found error when an attachment does not exist', async () => {
        clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([
          userComment,
        ]);

        await expect(
          bulkDeleteAttachments(
            { caseId: 'mock-id-1', savedObjectIds: ['mock-comment-1', 'does-not-exist'] },
            clientArgs
          )
        ).rejects.toThrow('Attachment does-not-exist does not exist on case mock-id-1.');

        expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalled();
        expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
      });

      it('pluralizes the message when several attachments do not exist', async () => {
        clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([]);

        await expect(
          bulkDeleteAttachments(
            { caseId: 'mock-id-1', savedObjectIds: ['does-not-exist-1', 'does-not-exist-2'] },
            clientArgs
          )
        ).rejects.toThrow(
          'Attachments does-not-exist-1, does-not-exist-2 do not exist on case mock-id-1.'
        );
      });

      it('wraps the errors of the shared deletion', async () => {
        clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(
          bulkDeleteAttachments(
            { caseId: 'mock-id-1', savedObjectIds: ['mock-comment-1'] },
            clientArgs
          )
        ).rejects.toThrow(
          'Failed to bulk delete attachments for case: mock-id-1: Error: Unauthorized'
        );
      });
    });
  });

  describe('bulkDeleteFileAttachments', () => {
    const casesClient = createCasesClientMock();
    const clientArgs = createCasesClientMockArgs();
    const caseId = 'mock-id-1';
    const fileId = 'file-1';
    const { id, version, ...attributes } = commentFileExternalReference;
    const fileAttachment: AttachmentForDeletion = {
      id: 'file-attachment-1',
      type: CASE_COMMENT_SAVED_OBJECT,
      owner: attributes.owner,
      references: [{ id: caseId, name: 'associated-cases', type: CASE_SAVED_OBJECT }],
      fileId,
      attributes,
    };

    const mockFile = (caseIds: string[]) =>
      ({
        id: fileId,
        data: {
          id: fileId,
          fileKind: constructFileKindIdByOwner('securitySolution'),
          meta: { caseIds, owner: ['securitySolution'] },
        },
      } as unknown as File);

    const deleteFileAttachments = () =>
      bulkDeleteFileAttachments({ caseId, fileIds: [fileId] }, clientArgs, casesClient);

    beforeEach(() => {
      jest.resetAllMocks();

      clientArgs.fileService.getById.mockResolvedValue(mockFile([caseId]));
      clientArgs.services.attachmentService.getter.getFileAttachmentsForDeletion.mockResolvedValue([
        fileAttachment,
      ]);
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map()
      );
      clientArgs.services.attachmentService.bulkDelete.mockImplementation(
        async ({ savedObjectIds }) => savedObjectIds
      );
    });

    it(`throws 400 when trying to delete more than ${MAX_DELETE_FILES} files at a time`, async () => {
      const fileIds = new Array(MAX_DELETE_FILES + 1).fill('fake-ids');

      await expect(
        bulkDeleteFileAttachments({ caseId: 'mock-id', fileIds }, clientArgs, casesClient)
      ).rejects.toThrow(
        'Failed to delete file attachments for case: mock-id: Error: The length of the field ids is too long. Array must be of length <= 10'
      );
    });

    it('deletes the attachments, then their files', async () => {
      await deleteFileAttachments();

      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['file-attachment-1'],
        refresh: true,
      });
      expect(clientArgs.fileService.delete).toHaveBeenCalledTimes(1);
      expect(clientArgs.fileService.delete).toHaveBeenCalledWith({ id: fileId });
      expect(
        clientArgs.services.attachmentService.bulkDelete.mock.invocationCallOrder[0]
      ).toBeLessThan(clientArgs.fileService.delete.mock.invocationCallOrder[0]);
    });

    it('deletes a file that has no attachment after authorizing it', async () => {
      clientArgs.services.attachmentService.getter.getFileAttachmentsForDeletion.mockResolvedValue(
        []
      );

      await deleteFileAttachments();

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [{ id: fileId, owner: 'securitySolution' }],
        operation: Operations.deleteComment,
      });
      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
      expect(clientArgs.fileService.delete).toHaveBeenCalledWith({ id: fileId });
    });

    it('rejects a file linked to another case before deleting anything', async () => {
      clientArgs.fileService.getById.mockResolvedValue(mockFile([caseId, 'mock-id-2']));

      await expect(deleteFileAttachments()).rejects.toThrow(/file ids were invalid: file-1/);

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
      expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
    });

    it('deletes nothing when the user is not authorized', async () => {
      clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(deleteFileAttachments()).rejects.toThrow('Unauthorized');

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
      expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
    });

    it('emits the event for the deleted file attachments', async () => {
      await deleteFileAttachments();

      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
        clientArgs.request,
        {
          caseId,
          attachmentIds: ['file-attachment-1'],
          attachmentType: 'externalReference',
          owner: 'securitySolution',
        }
      );
    });

    it('does not emit the event when no file attachments were found', async () => {
      clientArgs.services.attachmentService.getter.getFileAttachmentsForDeletion.mockResolvedValue(
        []
      );

      await deleteFileAttachments();

      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).not.toHaveBeenCalled();
    });
  });
});
