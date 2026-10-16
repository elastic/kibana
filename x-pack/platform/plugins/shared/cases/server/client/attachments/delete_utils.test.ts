/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { File } from '@kbn/files-plugin/common';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';
import { FileNotFoundError } from '@kbn/files-plugin/server/file_service/errors';
import { z } from '@kbn/zod/v4';
import type { AttachmentAttributesV2 } from '../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  FILE_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
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
        expect.objectContaining({ attachmentIds: ['mock-comment-1'] })
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
        attachmentIds: ['mock-comment-1', 'mock-comment-2'],
        attachmentType: 'user',
        owner: 'securitySolution',
      });
      expect(emitAttachmentsDeleted).toHaveBeenCalledWith(clientArgs.request, {
        caseId,
        attachmentIds: ['mock-comment-4'],
        attachmentType: 'alert',
        owner: 'securitySolution',
        alertIds: ['test-id'],
        alertIndices: ['test-index'],
      });
    });
  });

  describe('related attachments', () => {
    const relatedComment = mockCaseComments[1];
    const relatedAlert = mockCaseComments[3];
    const unrelatedAttachment = mockCaseComments[6];
    const onDelete = jest.fn();
    const argsWithHook = createCasesClientMockArgs();
    argsWithHook.unifiedAttachmentTypeRegistry.register({
      id: SECURITY_ATTACK_ATTACHMENT_TYPE,
      schema: z.object({}),
      onDelete,
    });

    const deleteWithRelated = (attachments: AttachmentForDeletion[], includeRelated?: boolean) =>
      deleteCaseAttachments({ caseId, attachments, operation, includeRelated }, argsWithHook);

    beforeEach(() => {
      onDelete.mockResolvedValue({ relatedAttachmentIds: [relatedComment.id, relatedAlert.id] });
      argsWithHook.services.caseService.getAllCaseComments.mockResolvedValue({
        saved_objects: [relatedComment, relatedAlert, unrelatedAttachment].map((so) => ({
          ...so,
          score: 0,
        })),
        total: 3,
        per_page: 100,
        page: 1,
      });
      argsWithHook.services.attachmentService.getter.bulkGetForDeletionByType.mockResolvedValue([
        toAttachmentForDeletion(relatedComment),
        toAttachmentForDeletion(relatedAlert),
      ]);
      argsWithHook.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map()
      );
      argsWithHook.services.attachmentService.bulkDelete.mockImplementation(
        async ({ savedObjectIds }) => savedObjectIds
      );
    });

    it('deletes the attachments the onDelete hook names alongside the requested ones', async () => {
      await deleteWithRelated([attackAttachment]);

      expect(argsWithHook.services.attachmentService.bulkDelete).toHaveBeenCalledTimes(1);
      expect(argsWithHook.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['attack-attachment-1', 'mock-comment-2', 'mock-comment-4'],
        refresh: true,
      });
    });

    it('reads the related attachments for deletion by their saved object type', async () => {
      await deleteWithRelated([attackAttachment]);

      expect(
        argsWithHook.services.attachmentService.getter.bulkGetForDeletionByType
      ).toHaveBeenCalledWith([
        { id: 'mock-comment-2', type: relatedComment.type },
        { id: 'mock-comment-4', type: relatedAlert.type },
      ]);
    });

    it('does not delete a related file attachment, even when the hook names it', async () => {
      onDelete.mockResolvedValue({
        relatedAttachmentIds: [relatedComment.id, relatedAlert.id, fileAttachment.id],
      });
      argsWithHook.services.attachmentService.getter.bulkGetForDeletionByType.mockResolvedValue([
        toAttachmentForDeletion(relatedComment),
        toAttachmentForDeletion(relatedAlert),
        fileAttachment,
      ]);

      await deleteWithRelated([attackAttachment]);

      expect(argsWithHook.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['attack-attachment-1', 'mock-comment-2', 'mock-comment-4'],
        refresh: true,
      });
      expect(argsWithHook.fileService.getById).not.toHaveBeenCalled();
    });

    it('authorizes the related attachments with the given operation', async () => {
      await deleteWithRelated([attackAttachment]);

      expect(argsWithHook.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [
          { id: 'mock-comment-2', owner: 'securitySolution' },
          { id: 'mock-comment-4', owner: 'securitySolution' },
        ],
        operation,
      });
    });

    it('authorizes a related attachment with no stored owner on the case owner', async () => {
      argsWithHook.services.caseService.getCase.mockResolvedValue({
        ...mockCases[0],
        attributes: { ...mockCases[0].attributes, owner: 'observability' },
      });
      argsWithHook.services.attachmentService.getter.bulkGetForDeletionByType.mockResolvedValue([
        withoutOwner(toAttachmentForDeletion(relatedComment)),
        toAttachmentForDeletion(relatedAlert),
      ]);

      await deleteWithRelated([attackAttachment]);

      expect(argsWithHook.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [
          { id: 'mock-comment-2', owner: 'observability' },
          { id: 'mock-comment-4', owner: 'securitySolution' },
        ],
        operation,
      });
    });

    it('deletes nothing when the user is not authorized for a related attachment', async () => {
      argsWithHook.authorization.ensureAuthorized
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(deleteWithRelated([attackAttachment])).rejects.toThrow('Unauthorized');

      expect(argsWithHook.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
    });

    it('records the related attachments in the deletion user action', async () => {
      await deleteWithRelated([attackAttachment]);

      const [{ attachments }] =
        argsWithHook.services.userActionService.creator.bulkCreateAttachmentDeletion.mock.calls[0];

      expect(attachments.map(({ id }) => id)).toEqual([
        'attack-attachment-1',
        'mock-comment-2',
        'mock-comment-4',
      ]);
    });

    it('removes the case id from the related alerts', async () => {
      await deleteWithRelated([attackAttachment]);

      expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
        alerts: [{ id: 'test-id', index: 'test-index' }],
        caseId,
      });
    });

    it('does not run the onDelete hook when an attachment belongs to another case', async () => {
      const attackOfOtherCase: AttachmentForDeletion = {
        ...attackAttachment,
        references: [{ id: 'other-case', name: 'associated-cases', type: CASE_SAVED_OBJECT }],
      };

      await expect(deleteWithRelated([attackOfOtherCase])).rejects.toThrow(
        'Attachment attack-attachment-1 does not exist on case mock-id-1.'
      );

      expect(onDelete).not.toHaveBeenCalled();
    });

    it('skips the onDelete hook when includeRelated is false', async () => {
      await deleteWithRelated([attackAttachment], false);

      expect(onDelete).not.toHaveBeenCalled();
      expect(argsWithHook.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        savedObjectIds: ['attack-attachment-1'],
        refresh: true,
      });
    });

    describe('when the hook shrinks an attachment', () => {
      argsWithHook.unifiedAttachmentTypeRegistry.register({
        id: SECURITY_ALERT_ATTACHMENT_TYPE,
        schema: z.object({ attachmentId: z.array(z.string()).min(1) }),
      });

      const withStoredAlerts = (
        index: string | string[],
        id: string = 'shared-alerts-1'
      ): AttachmentForDeletion => ({
        ...toAttachmentForDeletion(mockCaseComments[3]),
        id,
        attributes: {
          ...mockCaseComments[0].attributes,
          type: SECURITY_ALERT_ATTACHMENT_TYPE,
          attachmentId: ['alert-1', 'alert-2', 'alert-3'],
          metadata: { index },
        } as unknown as AttachmentAttributesV2,
      });

      const sharedAlerts = withStoredAlerts(['index-1', 'index-2', 'index-3']);
      const otherAlerts = withStoredAlerts(['index-1', 'index-2', 'index-3'], 'other-alerts-1');

      const shrunkPayload = {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        owner: 'securitySolution',
        attachmentId: ['alert-2'],
        metadata: { index: ['index-2'] },
      };

      // Keeps every alert and only rewrites where the attachment came from.
      const reprovenancedPayload = {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        owner: 'securitySolution',
        attachmentId: ['alert-1', 'alert-2', 'alert-3'],
        metadata: {
          index: ['index-1', 'index-2', 'index-3'],
          sourceAttachmentIds: ['attack-doc-2'],
        },
      };

      const toStoredAttachment = ({ id, attributes }: AttachmentForDeletion) =>
        ({ ...relatedAlert, id, attributes } as unknown as typeof relatedAlert);

      const mockCaseAttachments = (...shrinkTargets: AttachmentForDeletion[]) => {
        argsWithHook.services.caseService.getAllCaseComments.mockResolvedValue({
          saved_objects: [
            relatedComment,
            relatedAlert,
            unrelatedAttachment,
            toStoredAttachment(sharedAlerts),
            toStoredAttachment(otherAlerts),
          ].map((so) => ({ ...so, score: 0 })),
          total: 5,
          per_page: 100,
          page: 1,
        });
        argsWithHook.services.attachmentService.getter.bulkGetForDeletionByType.mockImplementation(
          async (refs) =>
            [
              toAttachmentForDeletion(relatedComment),
              toAttachmentForDeletion(relatedAlert),
              ...shrinkTargets,
            ].filter(({ id }) => refs.some((ref) => ref.id === id))
        );
      };

      beforeEach(() => {
        onDelete.mockResolvedValue({
          relatedAttachmentIds: [],
          relatedAttachmentUpdates: [{ id: sharedAlerts.id, payload: shrunkPayload }],
        });
        mockCaseAttachments(sharedAlerts);
      });

      it('writes the new payload over the stored one, keeping its references', async () => {
        await deleteWithRelated([attackAttachment]);

        expect(argsWithHook.services.attachmentService.update).toHaveBeenCalledTimes(1);
        expect(argsWithHook.services.attachmentService.update).toHaveBeenCalledWith({
          savedObjectId: 'shared-alerts-1',
          updatedAttributes: {
            ...shrunkPayload,
            updated_at: expect.any(String),
            updated_by: argsWithHook.user,
          },
          options: { references: sharedAlerts.references, refresh: true },
        });
      });

      it('records an update user action for the shrunk attachment', async () => {
        await deleteWithRelated([attackAttachment]);

        expect(
          argsWithHook.services.userActionService.creator.createUserAction
        ).toHaveBeenCalledWith({
          userAction: {
            type: UserActionTypes.comment,
            action: UserActionActions.update,
            caseId,
            savedObjectId: 'shared-alerts-1',
            savedObjectType: sharedAlerts.type,
            payload: { attachment: shrunkPayload },
            user: argsWithHook.user,
            owner: 'securitySolution',
          },
        });
      });

      it('does not delete the shrunk attachment', async () => {
        await deleteWithRelated([attackAttachment]);

        expect(argsWithHook.services.attachmentService.bulkDelete).toHaveBeenCalledTimes(1);
        expect(argsWithHook.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
          savedObjectIds: ['attack-attachment-1'],
          refresh: true,
        });
      });

      it('records the dropped alerts as a deletion before the update', async () => {
        await deleteWithRelated([attackAttachment]);

        const { creator } = argsWithHook.services.userActionService;

        expect(creator.bulkCreateAttachmentDeletion).toHaveBeenCalledWith({
          caseId,
          attachments: [
            {
              id: 'shared-alerts-1',
              owner: 'securitySolution',
              savedObjectType: sharedAlerts.type,
              attachment: {
                type: SECURITY_ALERT_ATTACHMENT_TYPE,
                owner: 'securitySolution',
                attachmentId: ['alert-1', 'alert-3'],
                metadata: { index: ['index-1', 'index-3'] },
              },
            },
          ],
          user: argsWithHook.user,
        });

        const droppedOrder = creator.bulkCreateAttachmentDeletion.mock.calls.findIndex(
          ([{ attachments }]) => attachments.some(({ id }) => id === 'shared-alerts-1')
        );

        expect(
          creator.bulkCreateAttachmentDeletion.mock.invocationCallOrder[droppedOrder]
        ).toBeLessThan(creator.createUserAction.mock.invocationCallOrder[0]);
      });

      it('removes the case id only from the alerts the attachment dropped', async () => {
        await deleteWithRelated([attackAttachment]);

        expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledTimes(1);
        expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
          alerts: [
            { id: 'alert-1', index: 'index-1' },
            { id: 'alert-3', index: 'index-3' },
          ],
          caseId,
        });
      });

      it('removes the case id from the dropped alerts of a stored scalar index', async () => {
        mockCaseAttachments(withStoredAlerts('.alerts-default'));

        await deleteWithRelated([attackAttachment]);

        expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
          alerts: [
            { id: 'alert-1', index: '.alerts-default' },
            { id: 'alert-3', index: '.alerts-default' },
          ],
          caseId,
        });
      });

      it('authorizes the shrunk attachment as an update and the deleted ones with the given operation', async () => {
        onDelete.mockResolvedValue({
          relatedAttachmentIds: [relatedComment.id],
          relatedAttachmentUpdates: [{ id: sharedAlerts.id, payload: shrunkPayload }],
        });

        await deleteWithRelated([attackAttachment]);

        const { ensureAuthorized } = argsWithHook.authorization;
        expect(ensureAuthorized).toHaveBeenCalledTimes(3);
        expect(ensureAuthorized).toHaveBeenCalledWith({
          entities: [{ id: 'attack-attachment-1', owner: 'securitySolution' }],
          operation,
        });
        expect(ensureAuthorized).toHaveBeenCalledWith({
          entities: [{ id: 'mock-comment-2', owner: 'securitySolution' }],
          operation,
        });
        expect(ensureAuthorized).toHaveBeenCalledWith({
          entities: [{ id: 'shared-alerts-1', owner: 'securitySolution' }],
          operation: Operations.updateComment,
        });
        expect(argsWithHook.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
          savedObjectIds: ['attack-attachment-1', 'mock-comment-2'],
          refresh: true,
        });
      });

      it('shrinks the attachment after the deletion and before the case stats are recomputed', async () => {
        await deleteWithRelated([attackAttachment]);

        const [updateOrder] =
          argsWithHook.services.attachmentService.update.mock.invocationCallOrder;

        expect(updateOrder).toBeGreaterThan(
          argsWithHook.services.attachmentService.bulkDelete.mock.invocationCallOrder[0]
        );
        expect(updateOrder).toBeLessThan(
          argsWithHook.services.attachmentService.getter.getCaseAttatchmentStats.mock
            .invocationCallOrder[0]
        );
        expect(updateOrder).toBeLessThan(
          argsWithHook.services.caseService.patchCase.mock.invocationCallOrder[0]
        );
      });

      it('shrinks nothing when no attachment was deleted', async () => {
        argsWithHook.services.attachmentService.bulkDelete.mockResolvedValue([]);

        await expect(deleteWithRelated([attackAttachment])).rejects.toThrow(
          'Failed to delete attachment attack-attachment-1 on case mock-id-1.'
        );

        expect(argsWithHook.services.attachmentService.update).not.toHaveBeenCalled();
        expect(
          argsWithHook.services.userActionService.creator.bulkCreateAttachmentDeletion
        ).not.toHaveBeenCalled();
        expect(
          argsWithHook.services.userActionService.creator.createUserAction
        ).not.toHaveBeenCalled();
        expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalled();
      });

      it('deletes nothing when a payload does not match the schema of its type', async () => {
        argsWithHook.fileService.getById.mockResolvedValue(mockFile([caseId]));
        onDelete.mockResolvedValue({
          relatedAttachmentIds: [relatedComment.id],
          relatedAttachmentUpdates: [
            { id: sharedAlerts.id, payload: { ...shrunkPayload, attachmentId: [] } },
          ],
        });

        await expect(deleteWithRelated([attackAttachment, fileAttachment])).rejects.toThrow(
          "Invalid attachment payload for type 'security.alert'"
        );

        const { creator } = argsWithHook.services.userActionService;
        expect(argsWithHook.services.attachmentService.bulkDelete).not.toHaveBeenCalled();
        expect(argsWithHook.services.attachmentService.update).not.toHaveBeenCalled();
        expect(argsWithHook.fileService.delete).not.toHaveBeenCalled();
        expect(argsWithHook.services.caseService.patchCase).not.toHaveBeenCalled();
        expect(creator.bulkCreateAttachmentDeletion).not.toHaveBeenCalled();
        expect(creator.createUserAction).not.toHaveBeenCalled();
        expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalled();
      });

      describe('when the update drops no alert', () => {
        beforeEach(() => {
          onDelete.mockResolvedValue({
            relatedAttachmentIds: [],
            relatedAttachmentUpdates: [{ id: sharedAlerts.id, payload: reprovenancedPayload }],
          });
        });

        it('still writes the new payload', async () => {
          await deleteWithRelated([attackAttachment]);

          expect(argsWithHook.services.attachmentService.update).toHaveBeenCalledWith({
            savedObjectId: 'shared-alerts-1',
            updatedAttributes: {
              ...reprovenancedPayload,
              updated_at: expect.any(String),
              updated_by: argsWithHook.user,
            },
            options: { references: sharedAlerts.references, refresh: true },
          });
        });

        it('records no activity for it and unlinks no alert', async () => {
          await deleteWithRelated([attackAttachment]);

          const { creator } = argsWithHook.services.userActionService;
          expect(creator.bulkCreateAttachmentDeletion).toHaveBeenCalledTimes(1);
          expect(creator.bulkCreateAttachmentDeletion).toHaveBeenCalledWith(
            expect.objectContaining({
              attachments: [expect.objectContaining({ id: 'attack-attachment-1' })],
            })
          );
          expect(creator.createUserAction).not.toHaveBeenCalled();
          expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalled();
        });

        it('records activity only for the attachment that shrank alongside it', async () => {
          onDelete.mockResolvedValue({
            relatedAttachmentIds: [],
            relatedAttachmentUpdates: [
              { id: sharedAlerts.id, payload: reprovenancedPayload },
              { id: otherAlerts.id, payload: shrunkPayload },
            ],
          });
          mockCaseAttachments(sharedAlerts, otherAlerts);

          await deleteWithRelated([attackAttachment]);

          const { creator } = argsWithHook.services.userActionService;
          expect(
            argsWithHook.services.attachmentService.update.mock.calls.map(
              ([{ savedObjectId }]) => savedObjectId
            )
          ).toEqual(['shared-alerts-1', 'other-alerts-1']);
          expect(creator.bulkCreateAttachmentDeletion).toHaveBeenCalledWith({
            caseId,
            attachments: [
              expect.objectContaining({
                id: 'other-alerts-1',
                attachment: expect.objectContaining({ attachmentId: ['alert-1', 'alert-3'] }),
              }),
            ],
            user: argsWithHook.user,
          });
          expect(creator.createUserAction).toHaveBeenCalledTimes(1);
          expect(creator.createUserAction).toHaveBeenCalledWith({
            userAction: expect.objectContaining({ savedObjectId: 'other-alerts-1' }),
          });
          expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledTimes(
            1
          );
          expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
            alerts: [
              { id: 'alert-1', index: 'index-1' },
              { id: 'alert-3', index: 'index-3' },
            ],
            caseId,
          });
        });
      });

      it('skips an attachment whose stored attributes do not decode', async () => {
        mockCaseAttachments(withoutAttributes(sharedAlerts));

        await deleteWithRelated([attackAttachment]);

        expect(argsWithHook.services.attachmentService.update).not.toHaveBeenCalled();
        expect(
          argsWithHook.services.userActionService.creator.createUserAction
        ).not.toHaveBeenCalled();
        expect(argsWithHook.services.alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalled();
      });

      it('shrinks nothing when includeRelated is false', async () => {
        await deleteWithRelated([attackAttachment], false);

        expect(
          argsWithHook.services.attachmentService.getter.bulkGetForDeletionByType
        ).not.toHaveBeenCalled();
        expect(argsWithHook.services.attachmentService.update).not.toHaveBeenCalled();
        expect(
          argsWithHook.services.userActionService.creator.createUserAction
        ).not.toHaveBeenCalled();
      });
    });
  });
});
