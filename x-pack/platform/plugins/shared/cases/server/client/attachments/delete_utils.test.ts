/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { File } from '@kbn/files-plugin/common';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';
import { FileNotFoundError } from '@kbn/files-plugin/server/file_service/errors';
import type { AttachmentAttributesV2 } from '../../../common/types/domain';
import { CASE_ATTACHMENT_SAVED_OBJECT } from '../../../common/constants';
import {
  FILE_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { constructFileKindIdByOwner } from '../../../common/files';
import { Operations } from '../../authorization';
import type { AttachmentForDeletion } from '../../services/attachments/types';
import { mockCaseComments, mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { deleteCaseAttachments, doNotExistOnCaseMessage } from './delete_utils';
import { toAttachmentForDeletion } from './test_utils/deletion';

const caseId = 'mock-id-1';

const withoutAttributes = ({ attributes, ...rest }: AttachmentForDeletion) => rest;
const withoutOwner = ({ owner, ...rest }: AttachmentForDeletion) => rest;

const userComment = toAttachmentForDeletion(mockCaseComments[0]);
const otherUserComment = toAttachmentForDeletion(mockCaseComments[1]);
const alertAttachment = toAttachmentForDeletion(mockCaseComments[3]);
const persistableStateAttachment = toAttachmentForDeletion(mockCaseComments[6]);

const fileId = 'file-1';
const fileAttachment: AttachmentForDeletion = {
  ...userComment,
  id: 'file-attachment-1',
  type: CASE_ATTACHMENT_SAVED_OBJECT,
  fileId,
  attributes: {
    ...mockCaseComments[0].attributes,
    type: FILE_ATTACHMENT_TYPE,
    attachmentId: fileId,
    metadata: {
      files: [
        { name: 'screenshot', extension: 'png', mimeType: 'image/png', created: '2026-10-13' },
      ],
      soType: FILE_SO_TYPE,
    },
  } as unknown as AttachmentAttributesV2,
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

describe('doNotExistOnCaseMessage', () => {
  it('names a single attachment', () => {
    expect(doNotExistOnCaseMessage(['a'], caseId)).toBe(
      'Attachment a does not exist on case mock-id-1.'
    );
  });

  it('pluralizes several attachments', () => {
    expect(doNotExistOnCaseMessage(['a', 'b'], caseId)).toBe(
      'Attachments a, b do not exist on case mock-id-1.'
    );
  });
});

describe('deleteCaseAttachments', () => {
  const clientArgs = createCasesClientMockArgs();
  const operation = Operations.deleteComment;

  const deleteAttachments = (
    attachments: AttachmentForDeletion[],
    notInCaseMessage?: (ids: string[]) => string
  ) => deleteCaseAttachments({ caseId, attachments, operation, notInCaseMessage }, clientArgs);

  beforeEach(() => {
    jest.resetAllMocks();

    clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map()
    );
    clientArgs.services.attachmentService.getter.getFileAttachmentsForDeletion.mockResolvedValue(
      []
    );
    // Mirrors the real service, which answers with the ids it confirmed deleted.
    clientArgs.services.attachmentService.bulkDelete.mockImplementation(
      async ({ savedObjectIds }) => savedObjectIds
    );
  });

  it('deletes every attachment in a single call and refreshes', async () => {
    await deleteAttachments([userComment, otherUserComment]);

    expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledTimes(1);
    expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
      savedObjectIds: ['mock-comment-1', 'mock-comment-2'],
      refresh: true,
    });
  });

  it('deletes a unified-only attachment, which has no legacy representation', async () => {
    const attackAttachment: AttachmentForDeletion = {
      ...userComment,
      id: 'attack-attachment-1',
      type: CASE_ATTACHMENT_SAVED_OBJECT,
      attributes: {
        ...mockCaseComments[0].attributes,
        type: SECURITY_ATTACK_ATTACHMENT_TYPE,
        attachmentId: 'attack-doc-1',
        metadata: { title: 'Credential harvesting', alertCount: 1, index: '.alerts-attacks' },
      } as unknown as AttachmentAttributesV2,
    };

    await deleteAttachments([attackAttachment]);

    expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
      savedObjectIds: ['attack-attachment-1'],
      refresh: true,
    });
  });

  describe('authorization', () => {
    it('authorizes every attachment owner with the given operation', async () => {
      await deleteAttachments([userComment, persistableStateAttachment]);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [
          { id: 'mock-comment-1', owner: 'securitySolution' },
          { id: 'mock-comment-7', owner: 'cases' },
        ],
        operation,
      });
    });

    it('does not read the case before authorizing when every stored owner is valid', async () => {
      await deleteAttachments([userComment]);

      expect(clientArgs.services.caseService.getCase.mock.invocationCallOrder[0]).toBeGreaterThan(
        clientArgs.authorization.ensureAuthorized.mock.invocationCallOrder[0]
      );
    });

    it('authorizes a row with no stored owner on the case owner', async () => {
      clientArgs.services.caseService.getCase.mockResolvedValue({
        ...mockCases[0],
        attributes: { ...mockCases[0].attributes, owner: 'observability' },
      });

      await deleteAttachments([userComment, withoutOwner(withoutAttributes(alertAttachment))]);

      // Once before the deletion, shared with the existence check, and once for the stats patch.
      expect(clientArgs.services.caseService.getCase).toHaveBeenCalledTimes(2);
      expect(clientArgs.services.caseService.getCase).toHaveBeenCalledWith({ id: caseId });
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [
          { id: 'mock-comment-1', owner: 'securitySolution' },
          { id: 'mock-comment-4', owner: 'observability' },
        ],
        operation,
      });
      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['mock-comment-1', 'mock-comment-4'],
        refresh: true,
      });
    });

    it('records the user action and event on the case owner when the stored owner is empty', async () => {
      clientArgs.services.caseService.getCase.mockResolvedValue({
        ...mockCases[0],
        attributes: { ...mockCases[0].attributes, owner: 'observability' },
      });
      const emptyOwnerComment: AttachmentForDeletion = {
        ...withoutOwner(userComment),
        attributes: {
          ...mockCaseComments[0].attributes,
          owner: '',
        } as AttachmentAttributesV2,
      };

      await deleteAttachments([emptyOwnerComment]);

      const [{ attachments }] =
        clientArgs.services.userActionService.creator.bulkCreateAttachmentDeletion.mock.calls[0];

      expect(attachments[0].owner).toBe('observability');
      expect(attachments[0].attachment.owner).toBe('observability');
      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
        clientArgs.request,
        expect.objectContaining({ owner: 'observability' })
      );
    });

    it('does not delete anything when the user is not authorized', async () => {
      clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(deleteAttachments([userComment])).rejects.toThrow('Unauthorized');

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
    });

    it('authorizes before disclosing which case an attachment belongs to', async () => {
      clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));
      const attachmentOfOtherCase = toAttachmentForDeletion(mockCaseComments[0], 'other-case');

      await expect(deleteAttachments([attachmentOfOtherCase])).rejects.toThrow('Unauthorized');
    });

    it('authorizes before looking up the file of a file attachment', async () => {
      clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(deleteAttachments([fileAttachment])).rejects.toThrow('Unauthorized');

      expect(clientArgs.fileService.getById).not.toHaveBeenCalled();
    });
  });

  describe('case association', () => {
    const attachmentOfOtherCase = toAttachmentForDeletion(mockCaseComments[1], 'other-case');

    it('throws a not found error for attachments of another case', async () => {
      await expect(deleteAttachments([userComment, attachmentOfOtherCase])).rejects.toThrow(
        'Attachment mock-comment-2 does not exist on case mock-id-1.'
      );

      expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
    });

    it('uses the given message', async () => {
      await expect(
        deleteAttachments([attachmentOfOtherCase], (ids) => `Custom ${ids.join()}`)
      ).rejects.toThrow('Custom mock-comment-2');
    });
  });

  describe('when an attachment fails to decode', () => {
    it('deletes it with the rest', async () => {
      await deleteAttachments([userComment, withoutAttributes(alertAttachment)]);

      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['mock-comment-1', 'mock-comment-4'],
        refresh: true,
      });
    });

    it('records user actions only for the decoded attachments', async () => {
      await deleteAttachments([userComment, withoutAttributes(alertAttachment)]);

      const [{ attachments }] =
        clientArgs.services.userActionService.creator.bulkCreateAttachmentDeletion.mock.calls[0];

      expect(attachments.map(({ id }) => id)).toEqual(['mock-comment-1']);
    });

    it('skips the user action when its attributes are not a valid request', async () => {
      const malformedAttachment: AttachmentForDeletion = {
        ...userComment,
        id: 'malformed-1',
        attributes: {
          ...mockCaseComments[0].attributes,
          type: 'not-a-valid-type',
        } as unknown as AttachmentAttributesV2,
      };

      await deleteAttachments([userComment, malformedAttachment]);

      const [{ attachments }] =
        clientArgs.services.userActionService.creator.bulkCreateAttachmentDeletion.mock.calls[0];

      expect(attachments.map(({ id }) => id)).toEqual(['mock-comment-1']);
    });

    it('skips the alert update and event', async () => {
      await deleteAttachments([withoutAttributes(alertAttachment)]);

      expect(clientArgs.services.alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalled();
      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).not.toHaveBeenCalled();
    });

    it('skips the user actions when no attachment decodes', async () => {
      await deleteAttachments([withoutAttributes(userComment)]);

      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalled();
      expect(
        clientArgs.services.userActionService.creator.bulkCreateAttachmentDeletion
      ).not.toHaveBeenCalled();
    });
  });

  describe('file attachments', () => {
    beforeEach(() => {
      clientArgs.fileService.getById.mockResolvedValue(mockFile([caseId]));
    });

    it('authorizes and deletes the file after the attachment', async () => {
      await deleteAttachments([fileAttachment]);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [{ id: fileId, owner: 'securitySolution' }],
        operation,
      });
      expect(clientArgs.fileService.delete).toHaveBeenCalledWith({ id: fileId });
      expect(
        clientArgs.services.attachmentService.bulkDelete.mock.invocationCallOrder[0]
      ).toBeLessThan(clientArgs.fileService.delete.mock.invocationCallOrder[0]);
    });

    it('keeps a file that another attachment of the case still references', async () => {
      clientArgs.services.attachmentService.getter.getFileAttachmentsForDeletion.mockResolvedValue([
        fileAttachment,
        { ...fileAttachment, id: 'file-attachment-2' },
      ]);

      await deleteAttachments([fileAttachment]);

      expect(
        clientArgs.services.attachmentService.getter.getFileAttachmentsForDeletion
      ).toHaveBeenCalledWith({ caseId, fileIds: [fileId] });
      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['file-attachment-1'],
        refresh: true,
      });
      expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
    });

    it('deletes the file of a file attachment that fails to decode', async () => {
      await deleteAttachments([withoutAttributes(fileAttachment)]);

      expect(clientArgs.fileService.delete).toHaveBeenCalledWith({ id: fileId });
    });

    it('keeps a file linked to another case and still deletes its attachment', async () => {
      clientArgs.fileService.getById.mockResolvedValue(mockFile([caseId, 'mock-id-2']));

      await deleteAttachments([fileAttachment]);

      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['file-attachment-1'],
        refresh: true,
      });
      expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
      expect(clientArgs.logger.warn).toHaveBeenCalledWith(expect.stringContaining(fileId));
    });

    it('still deletes the attachment when its file no longer exists', async () => {
      clientArgs.fileService.getById.mockRejectedValue(new FileNotFoundError('not found'));

      await deleteAttachments([fileAttachment]);

      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalled();
      expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
    });

    it('logs and completes when the file deletion fails', async () => {
      clientArgs.fileService.delete.mockRejectedValue(new Error('blob store down'));

      await deleteAttachments([fileAttachment]);

      expect(clientArgs.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('blob store down')
      );
      expect(
        clientArgs.services.userActionService.creator.bulkCreateAttachmentDeletion
      ).toHaveBeenCalled();
    });
  });

  it('deletes nothing when the case cannot be read', async () => {
    clientArgs.services.caseService.getCase.mockRejectedValue(new Error('case not found'));

    await expect(deleteAttachments([fileAttachment])).rejects.toThrow('case not found');

    expect(clientArgs.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
    expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
  });

  describe('when the saved object deletion fails', () => {
    it('records the attachments that did delete before throwing', async () => {
      clientArgs.services.attachmentService.bulkDelete.mockResolvedValue(['mock-comment-1']);

      await expect(deleteAttachments([userComment, alertAttachment])).rejects.toThrow(
        'Failed to delete attachment mock-comment-4 on case mock-id-1.'
      );

      expect(clientArgs.services.caseService.patchCase).toHaveBeenCalled();

      const [{ attachments }] =
        clientArgs.services.userActionService.creator.bulkCreateAttachmentDeletion.mock.calls[0];

      expect(attachments.map(({ id }) => id)).toEqual(['mock-comment-1']);
      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
        clientArgs.request,
        expect.objectContaining({ ids: ['mock-comment-1'] })
      );
    });

    it('clears the case id only from the alerts whose attachment did delete', async () => {
      const survivingAlertAttachment = toAttachmentForDeletion({
        ...mockCaseComments[3],
        id: 'mock-comment-5',
        attributes: {
          ...mockCaseComments[3].attributes,
          alertId: ['surviving-id'],
          index: ['surviving-index'],
        },
      } as (typeof mockCaseComments)[number]);
      clientArgs.services.attachmentService.bulkDelete.mockResolvedValue(['mock-comment-4']);

      await expect(deleteAttachments([alertAttachment, survivingAlertAttachment])).rejects.toThrow(
        'Failed to delete attachment mock-comment-5 on case mock-id-1.'
      );

      expect(clientArgs.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
        alerts: [{ id: 'test-id', index: 'test-index' }],
        caseId,
      });
    });

    it('keeps the file of an attachment that was not deleted', async () => {
      clientArgs.fileService.getById.mockResolvedValue(mockFile([caseId]));
      clientArgs.services.attachmentService.bulkDelete.mockResolvedValue(['mock-comment-1']);

      await expect(deleteAttachments([userComment, fileAttachment])).rejects.toThrow(
        'Failed to delete attachment file-attachment-1 on case mock-id-1.'
      );

      expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
    });

    it('keeps a file that an attachment which was not deleted still references', async () => {
      const otherFileAttachment = { ...fileAttachment, id: 'file-attachment-2' };
      clientArgs.fileService.getById.mockResolvedValue(mockFile([caseId]));
      clientArgs.services.attachmentService.bulkDelete.mockResolvedValue(['file-attachment-1']);

      await expect(deleteAttachments([fileAttachment, otherFileAttachment])).rejects.toThrow(
        'Failed to delete attachment file-attachment-2 on case mock-id-1.'
      );

      expect(clientArgs.fileService.getById).toHaveBeenCalledTimes(1);
      expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
    });

    it('writes nothing when no attachment was deleted', async () => {
      clientArgs.services.attachmentService.bulkDelete.mockResolvedValue([]);

      await expect(deleteAttachments([userComment, otherUserComment])).rejects.toThrow(
        'Failed to delete attachments mock-comment-1, mock-comment-2 on case mock-id-1.'
      );

      expect(clientArgs.services.caseService.patchCase).not.toHaveBeenCalled();
      expect(
        clientArgs.services.userActionService.creator.bulkCreateAttachmentDeletion
      ).not.toHaveBeenCalled();
      expect(clientArgs.services.alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalled();
      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).not.toHaveBeenCalled();
    });

    it('does not emit the event when the deletion throws', async () => {
      clientArgs.services.attachmentService.bulkDelete.mockRejectedValue(new Error('boom'));

      await expect(deleteAttachments([userComment])).rejects.toThrow('boom');

      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).not.toHaveBeenCalled();
    });
  });

  describe('after the deletion', () => {
    it('updates the case attachment stats', async () => {
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([[caseId, { userComments: 1, alerts: 3, events: 2 }]])
      );

      await deleteAttachments([userComment]);

      const [{ updatedAttributes }] = clientArgs.services.caseService.patchCase.mock.calls[0];

      expect(updatedAttributes).toEqual(
        expect.objectContaining({
          total_comments: 1,
          total_alerts: 3,
          total_events: 2,
          updated_by: clientArgs.user,
        })
      );
      expect(updatedAttributes.updated_at).toBeDefined();
    });

    it('patches the case from a read made after the deletion', async () => {
      await deleteAttachments([userComment]);

      const { invocationCallOrder } = clientArgs.services.caseService.getCase.mock;

      expect(invocationCallOrder[invocationCallOrder.length - 1]).toBeGreaterThan(
        clientArgs.services.attachmentService.bulkDelete.mock.invocationCallOrder[0]
      );
    });

    it('records the deletion user action without the non request fields', async () => {
      await deleteAttachments([userComment]);

      const [{ attachments }] =
        clientArgs.services.userActionService.creator.bulkCreateAttachmentDeletion.mock.calls[0];

      expect(attachments).toEqual([
        expect.objectContaining({
          id: 'mock-comment-1',
          owner: 'securitySolution',
          savedObjectType: userComment.type,
        }),
      ]);
      expect(attachments[0].attachment).not.toHaveProperty('created_at');
    });

    it('removes the case id from the deleted alerts', async () => {
      await deleteAttachments([alertAttachment]);

      expect(clientArgs.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
        alerts: [{ id: 'test-id', index: 'test-index' }],
        caseId,
      });
    });

    it('does not call the alert service when no alert was deleted', async () => {
      await deleteAttachments([userComment]);

      expect(clientArgs.services.alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalled();
    });

    it('emits one attachmentsDeleted event per attachment type', async () => {
      await deleteAttachments([userComment, otherUserComment, alertAttachment]);

      const { emitAttachmentsDeleted } = clientArgs.casesEventBus;
      expect(emitAttachmentsDeleted).toHaveBeenCalledTimes(2);
      expect(emitAttachmentsDeleted).toHaveBeenCalledWith(clientArgs.request, {
        caseId,
        ids: ['mock-comment-1', 'mock-comment-2'],
        attachmentType: 'user',
        owner: 'securitySolution',
      });
      expect(emitAttachmentsDeleted).toHaveBeenCalledWith(clientArgs.request, {
        caseId,
        ids: ['mock-comment-4'],
        attachmentType: 'alert',
        owner: 'securitySolution',
        alertIds: ['test-id'],
        alertIndices: ['test-index'],
      });
    });
  });
});
