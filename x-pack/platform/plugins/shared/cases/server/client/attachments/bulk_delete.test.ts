/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toKqlExpression } from '@kbn/es-query';
import { z } from '@kbn/zod/v4';
import type { File } from '@kbn/files-plugin/common';
import { FileNotFoundError } from '@kbn/files-plugin/server/file_service/errors';
import { bulkDeleteAttachments, bulkDeleteFileAttachments } from './bulk_delete';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_BULK_DELETE_ATTACHMENTS,
  MAX_DELETE_FILES,
} from '../../../common/constants';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { AttachmentAttributesV2 } from '../../../common/types/domain';
import { constructFileKindIdByOwner } from '../../../common/files';
import { Operations } from '../../authorization';
import type { AttachmentForDeletion } from '../../services/attachments/types';
import { mockCaseComments, mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { commentFileExternalReference } from '../cases/mock';
import { toAttachmentForDeletion } from './test_utils/deletion';

describe('bulk_delete', () => {
  describe('bulkDeleteAttachments', () => {
    const clientArgs = createCasesClientMockArgs();
    const userComment = toAttachmentForDeletion(mockCaseComments[0]);
    const otherUserComment = toAttachmentForDeletion(mockCaseComments[1]);

    const alertAttachment = (
      id: string,
      attachmentId: string | string[],
      index: string | string[]
    ): AttachmentForDeletion => ({
      ...userComment,
      id,
      type: CASE_ATTACHMENT_SAVED_OBJECT,
      version: `version-${id}`,
      attributes: {
        ...mockCaseComments[0].attributes,
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId,
        metadata: { index, rule: { id: 'rule-1', name: 'Rule 1' } },
      } as unknown as AttachmentAttributesV2,
    });

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
      clientArgs.services.caseService.getCase.mockResolvedValue(mockCases[0]);
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

    it('records one user action per attachment type', async () => {
      await bulkDeleteAttachments(
        { caseId: 'mock-id-1', savedObjectIds: ['mock-comment-1', 'mock-comment-2'] },
        clientArgs
      );

      const { creator } = clientArgs.services.userActionService;
      expect(creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'mock-id-1',
          owner: userComment.owner,
          deletions: [
            {
              attachmentType: 'comment',
              count: 2,
              attachments: [
                { id: 'mock-comment-1', savedObjectType: userComment.type },
                { id: 'mock-comment-2', savedObjectType: otherUserComment.type },
              ],
            },
          ],
        })
      );
      expect(creator.bulkCreateAttachmentDeletion).not.toHaveBeenCalled();
      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
        clientArgs.request,
        {
          caseId: 'mock-id-1',
          ids: ['mock-comment-1', 'mock-comment-2'],
          attachmentType: 'user',
          owner: 'securitySolution',
        }
      );
    });

    it('counts every referenced id and passes each deleted attachment for the audit log', async () => {
      clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([
        alertAttachment('attachment-1', ['alert-1', 'alert-2', 'alert-3'], 'index-1'),
        userComment,
      ]);

      await bulkDeleteAttachments(
        { caseId: 'mock-id-1', savedObjectIds: ['attachment-1', 'mock-comment-1'] },
        clientArgs
      );

      expect(
        clientArgs.services.userActionService.creator.bulkCreateAttachmentBulkDeletion
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          deletions: [
            {
              attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE,
              count: 3,
              attachments: [{ id: 'attachment-1', savedObjectType: CASE_ATTACHMENT_SAVED_OBJECT }],
            },
            {
              attachmentType: 'comment',
              count: 1,
              attachments: [{ id: 'mock-comment-1', savedObjectType: userComment.type }],
            },
          ],
        })
      );
    });

    it('counts an item referenced by several attachments once', async () => {
      clientArgs.services.attachmentService.getter.bulkGetForDeletion.mockResolvedValue([
        alertAttachment('attachment-1', ['alert-1', 'alert-2'], 'index-1'),
        alertAttachment('attachment-2', 'alert-1', 'index-1'),
      ]);

      await bulkDeleteAttachments(
        { caseId: 'mock-id-1', savedObjectIds: ['attachment-1', 'attachment-2'] },
        clientArgs
      );

      expect(
        clientArgs.services.userActionService.creator.bulkCreateAttachmentBulkDeletion
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          deletions: [expect.objectContaining({ count: 2 })],
        })
      );
    });

    describe('by attachment ids', () => {
      const caseId = 'mock-id-1';
      const { attachmentService, alertsService, caseService, userActionService } =
        clientArgs.services;

      const deleteAlerts = (attachmentIds: string[]) =>
        bulkDeleteAttachments(
          { caseId, type: SECURITY_ALERT_ATTACHMENT_TYPE, attachmentIds },
          clientArgs
        );

      beforeEach(() => {
        attachmentService.bulkUpdate.mockImplementation(async ({ comments }) => ({
          saved_objects: comments.map(({ savedObjectId, updatedAttributes }) => ({
            id: savedObjectId,
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            attributes: updatedAttributes,
            references: [],
          })),
        }));
      });

      it('deletes an attachment when every id it references is removed', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', ['alert-1', 'alert-2'], ['index-1', 'index-2']),
        ]);

        await deleteAlerts(['alert-1', 'alert-2']);

        expect(attachmentService.bulkDelete).toHaveBeenCalledWith({
          savedObjectIds: ['attachment-1'],
          refresh: true,
        });
        expect(attachmentService.bulkUpdate).not.toHaveBeenCalled();
        expect(userActionService.creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledWith(
          expect.objectContaining({
            deletions: [
              {
                attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE,
                count: 2,
                attachments: [
                  { id: 'attachment-1', savedObjectType: CASE_ATTACHMENT_SAVED_OBJECT },
                ],
              },
            ],
          })
        );
      });

      it('keeps the other ids of a grouped attachment and their aligned indices', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', ['alert-1', 'alert-2'], ['index-1', 'index-2']),
        ]);

        await deleteAlerts(['alert-1']);

        expect(attachmentService.bulkDelete).not.toHaveBeenCalled();
        expect(attachmentService.bulkUpdate).toHaveBeenCalledWith({
          comments: [
            {
              savedObjectId: 'attachment-1',
              updatedAttributes: expect.objectContaining({
                attachmentId: ['alert-2'],
                metadata: { index: ['index-2'], rule: { id: 'rule-1', name: 'Rule 1' } },
                updated_by: clientArgs.user,
              }),
              options: { version: 'version-attachment-1' },
            },
          ],
          refresh: true,
        });
        expect(alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
          alerts: [{ id: 'alert-1', index: 'index-1' }],
          caseId,
        });
        expect(caseService.patchCase).toHaveBeenCalled();
        expect(userActionService.creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledWith(
          expect.objectContaining({
            deletions: [
              { attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE, count: 1, attachments: [] },
            ],
          })
        );
      });

      it('keeps a single index shared by every id', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', ['alert-1', 'alert-2'], 'shared-index'),
        ]);

        await deleteAlerts(['alert-2']);

        const [{ comments }] = attachmentService.bulkUpdate.mock.calls[0];
        expect(comments[0].updatedAttributes).toEqual(
          expect.objectContaining({
            attachmentId: ['alert-1'],
            metadata: expect.objectContaining({ index: 'shared-index' }),
          })
        );
        expect(alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
          alerts: [{ id: 'alert-2', index: 'shared-index' }],
          caseId,
        });
      });

      it('records a single user action across deleted and updated attachments', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', 'alert-1', 'index-1'),
          alertAttachment('attachment-2', ['alert-2', 'alert-3'], ['index-2', 'index-3']),
        ]);

        await deleteAlerts(['alert-1', 'alert-2']);

        expect(attachmentService.bulkDelete).toHaveBeenCalledWith({
          savedObjectIds: ['attachment-1'],
          refresh: true,
        });
        expect(attachmentService.bulkUpdate).toHaveBeenCalledTimes(1);
        expect(userActionService.creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledTimes(1);
        expect(userActionService.creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledWith(
          expect.objectContaining({
            deletions: [
              {
                attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE,
                count: 2,
                attachments: [
                  { id: 'attachment-1', savedObjectType: CASE_ATTACHMENT_SAVED_OBJECT },
                ],
              },
            ],
          })
        );
      });

      it('emits 1 event with the alerts removed from deleted and updated attachments', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', 'alert-1', 'index-1'),
          alertAttachment('attachment-2', ['alert-2', 'alert-3'], ['index-2', 'index-3']),
        ]);

        await deleteAlerts(['alert-1', 'alert-2']);

        expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledTimes(1);
        expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
          clientArgs.request,
          {
            caseId,
            owner: mockCases[0].attributes.owner,
            attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE,
            ids: ['attachment-1'],
            alertIds: ['alert-1', 'alert-2'],
            alertIndices: ['index-1', 'index-2'],
          }
        );
      });

      it('updates the case totals once across deleted and updated attachments', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', 'alert-1', 'index-1'),
          alertAttachment('attachment-2', ['alert-2', 'alert-3'], ['index-2', 'index-3']),
        ]);

        await deleteAlerts(['alert-1', 'alert-2']);

        expect(caseService.patchCase).toHaveBeenCalledTimes(1);
      });

      it('only reads the attachments that reference the requested ids', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', 'alert-1', 'index-1'),
        ]);

        await deleteAlerts(['alert-1']);

        const [{ filter }] = attachmentService.getter.getCaseAttachmentsForDeletion.mock.calls[0];
        const kql = filter != null ? toKqlExpression(filter) : '';
        expect(kql).toContain(`${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.attachmentId: alert-1`);
        expect(kql).toContain(`${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId: alert-1`);
        expect(kql).toContain(`${CASE_COMMENT_SAVED_OBJECT}.attributes.eventId: alert-1`);
      });

      it('throws a not found error and changes nothing when an id is not attached', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', ['alert-1', 'alert-2'], ['index-1', 'index-2']),
        ]);

        await expect(deleteAlerts(['alert-1', 'missing'])).rejects.toThrow(
          `${SECURITY_ALERT_ATTACHMENT_TYPE} missing is not attached to case mock-id-1.`
        );

        expect(attachmentService.bulkUpdate).not.toHaveBeenCalled();
        expect(attachmentService.bulkDelete).not.toHaveBeenCalled();
        expect(userActionService.creator.bulkCreateAttachmentBulkDeletion).not.toHaveBeenCalled();
      });

      it('does not update attachments the user cannot delete', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', ['alert-1', 'alert-2'], ['index-1', 'index-2']),
        ]);
        clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(deleteAlerts(['alert-1'])).rejects.toThrow('Unauthorized');

        expect(attachmentService.bulkUpdate).not.toHaveBeenCalled();
        expect(alertsService.removeCaseIdFromAlerts).not.toHaveBeenCalled();
      });

      it('authorizes on the case owner before checking which ids are attached', async () => {
        clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(deleteAlerts(['missing'])).rejects.toThrow('Unauthorized');

        expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
          entities: [{ id: caseId, owner: mockCases[0].attributes.owner }],
          operation: Operations.deleteComment,
        });
        expect(attachmentService.getter.getCaseAttachmentsForDeletion).not.toHaveBeenCalled();
      });

      it('does not unlink or record the ids of an attachment that failed to update', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', ['alert-1', 'alert-2'], ['index-1', 'index-2']),
          alertAttachment('attachment-2', ['alert-3', 'alert-4'], ['index-3', 'index-4']),
        ]);
        attachmentService.bulkUpdate.mockResolvedValue({
          saved_objects: [
            {
              id: 'attachment-1',
              type: CASE_ATTACHMENT_SAVED_OBJECT,
              error: { statusCode: 409, error: 'Conflict', message: 'version conflict' },
            },
            {
              id: 'attachment-2',
              type: CASE_ATTACHMENT_SAVED_OBJECT,
              attributes: {},
              references: [],
            },
          ],
        });

        const error = await deleteAlerts(['alert-1', 'alert-3']).catch((caught) => caught);

        expect(error.message).toContain(
          `Failed to remove ${SECURITY_ALERT_ATTACHMENT_TYPE} ids from attachment attachment-1 on case mock-id-1.`
        );
        expect(error.boomify().output.statusCode).toBe(409);

        expect(alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
          alerts: [{ id: 'alert-3', index: 'index-3' }],
          caseId,
        });
        expect(userActionService.creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledWith(
          expect.objectContaining({
            deletions: [
              { attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE, count: 1, attachments: [] },
            ],
          })
        );
      });

      it('does not update the grouped attachments when deleting the whole ones fails', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', 'alert-1', 'index-1'),
          alertAttachment('attachment-2', ['alert-2', 'alert-3'], ['index-2', 'index-3']),
        ]);
        attachmentService.bulkDelete.mockResolvedValue([]);

        await expect(deleteAlerts(['alert-1', 'alert-2'])).rejects.toThrow(
          'Failed to delete attachment attachment-1 on case mock-id-1.'
        );

        expect(attachmentService.bulkUpdate).not.toHaveBeenCalled();
        expect(userActionService.creator.bulkCreateAttachmentBulkDeletion).not.toHaveBeenCalled();
      });

      it('throws the original error when recording the partial removal also fails', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([
          alertAttachment('attachment-1', 'alert-1', 'index-1'),
          alertAttachment('attachment-2', ['alert-2', 'alert-3'], ['index-2', 'index-3']),
        ]);
        attachmentService.bulkUpdate.mockRejectedValue(new Error('update failed'));
        caseService.patchCase.mockRejectedValue(new Error('stats failed'));

        await expect(deleteAlerts(['alert-1', 'alert-2'])).rejects.toThrow('update failed');

        expect(clientArgs.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('stats failed')
        );
      });

      describe('files', () => {
        const fileId = 'file-1';

        const deleteFilesByIds = (attachmentIds: string[]) =>
          bulkDeleteAttachments({ caseId, type: 'file', attachmentIds }, clientArgs);

        beforeEach(() => {
          clientArgs.fileService.getById.mockImplementation(async ({ id }) => {
            if (id !== fileId) {
              throw new FileNotFoundError(`File ${id} not found`);
            }

            return {
              id: fileId,
              data: {
                id: fileId,
                fileKind: constructFileKindIdByOwner('securitySolution'),
                meta: { caseIds: [caseId], owner: ['securitySolution'] },
              },
            } as unknown as File;
          });
          attachmentService.getter.getFileAttachmentsForDeletion.mockResolvedValue([]);
        });

        it('deletes a file that has no attachment', async () => {
          await deleteFilesByIds([fileId]);

          expect(attachmentService.bulkDelete).not.toHaveBeenCalled();
          expect(clientArgs.fileService.delete).toHaveBeenCalledWith({ id: fileId });
        });

        it('throws a not found error and deletes nothing for an id that is not a file of the case', async () => {
          await expect(deleteFilesByIds([fileId, 'missing'])).rejects.toThrow(
            'file missing is not attached to case mock-id-1.'
          );

          expect(clientArgs.fileService.delete).not.toHaveBeenCalled();
        });
      });

      it('throws when the attachment ids are empty', async () => {
        await expect(deleteAlerts([])).rejects.toThrow(
          'Failed to bulk delete attachments for case: mock-id-1: Error: attachmentIds: The length of the field attachmentIds is too short. Array must be of length >= 1'
        );
      });
    });

    describe('related attachments', () => {
      const caseId = 'mock-id-1';
      const PARENT_TYPE = 'test.parent';
      const relatedArgs = createCasesClientMockArgs();
      const getRelated = jest.fn();
      relatedArgs.unifiedAttachmentTypeRegistry.register({
        id: PARENT_TYPE,
        schema: z.object({}),
        relatedAttachments: { readTypes: [], get: getRelated },
      });
      const { attachmentService, caseService } = relatedArgs.services;

      const parent: AttachmentForDeletion = {
        ...alertAttachment('parent-1', 'parent-doc-1', 'parent-index'),
        attributes: {
          ...mockCaseComments[0].attributes,
          type: PARENT_TYPE,
          attachmentId: 'parent-doc-1',
          metadata: { index: 'parent-index' },
        } as unknown as AttachmentAttributesV2,
      };
      const child = alertAttachment('child-1', ['alert-1', 'alert-2'], 'index-1');

      beforeEach(() => {
        jest.resetAllMocks();
        caseService.getCase.mockResolvedValue(mockCases[0]);
        caseService.getAllCaseComments.mockResolvedValue({
          saved_objects: [],
          total: 0,
          per_page: 100,
          page: 1,
        });
        attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(new Map());
        attachmentService.bulkDelete.mockImplementation(
          async ({ savedObjectIds }) => savedObjectIds
        );
        attachmentService.bulkUpdate.mockImplementation(async ({ comments }) => ({
          saved_objects: comments.map(({ savedObjectId, updatedAttributes }) => ({
            id: savedObjectId,
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            attributes: updatedAttributes,
            references: [],
          })),
        }));
        getRelated.mockResolvedValue([
          { type: SECURITY_ALERT_ATTACHMENT_TYPE, attachmentIds: ['alert-1'] },
        ]);
      });

      it('removes the related ids before deleting the requested attachments', async () => {
        attachmentService.getter.bulkGetForDeletion.mockResolvedValue([parent]);
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([child]);

        await bulkDeleteAttachments({ caseId, savedObjectIds: ['parent-1'] }, relatedArgs);

        expect(getRelated).toHaveBeenCalledWith(
          expect.objectContaining({
            caseId,
            attachments: [expect.objectContaining({ id: 'parent-1' })],
          })
        );
        expect(attachmentService.bulkUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            comments: [
              expect.objectContaining({
                savedObjectId: 'child-1',
                updatedAttributes: expect.objectContaining({ attachmentId: ['alert-2'] }),
              }),
            ],
          })
        );
        expect(attachmentService.bulkDelete).toHaveBeenCalledWith({
          savedObjectIds: ['parent-1'],
          refresh: true,
        });
        expect(attachmentService.bulkUpdate.mock.invocationCallOrder[0]).toBeLessThan(
          attachmentService.bulkDelete.mock.invocationCallOrder[0]
        );
      });

      it('records 1 user action for the related type and 1 for the requested type', async () => {
        attachmentService.getter.bulkGetForDeletion.mockResolvedValue([parent]);
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([child]);

        await bulkDeleteAttachments({ caseId, savedObjectIds: ['parent-1'] }, relatedArgs);

        const { creator } = relatedArgs.services.userActionService;
        expect(creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledTimes(2);
        expect(creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledWith(
          expect.objectContaining({
            deletions: [
              expect.objectContaining({ attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE }),
            ],
          })
        );
        expect(creator.bulkCreateAttachmentBulkDeletion).toHaveBeenCalledWith(
          expect.objectContaining({
            deletions: [expect.objectContaining({ attachmentType: PARENT_TYPE, count: 1 })],
          })
        );
      });

      it('runs the hook when deleting by the ids the requested type references', async () => {
        attachmentService.getter.getCaseAttachmentsForDeletion
          .mockResolvedValueOnce([parent])
          .mockResolvedValueOnce([child]);

        await bulkDeleteAttachments(
          { caseId, type: PARENT_TYPE, attachmentIds: ['parent-doc-1'] },
          relatedArgs
        );

        expect(getRelated).toHaveBeenCalledTimes(1);
        expect(attachmentService.bulkUpdate).toHaveBeenCalled();
        expect(attachmentService.bulkDelete).toHaveBeenCalledWith({
          savedObjectIds: ['parent-1'],
          refresh: true,
        });
      });

      it.each([
        ['saved object ids', { savedObjectIds: ['parent-1'] }],
        ['attachment ids', { type: PARENT_TYPE, attachmentIds: ['parent-doc-1'] }],
      ])('skips the hook by %s when related attachments are excluded', async (_, request) => {
        attachmentService.getter.bulkGetForDeletion.mockResolvedValue([parent]);
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([parent]);

        await bulkDeleteAttachments({ caseId, includeRelated: false, ...request }, relatedArgs);

        expect(getRelated).not.toHaveBeenCalled();
        expect(attachmentService.bulkUpdate).not.toHaveBeenCalled();
        expect(attachmentService.bulkDelete).toHaveBeenCalledWith({
          savedObjectIds: ['parent-1'],
          refresh: true,
        });
      });

      it('does not run the hook when the user may not delete the requested attachments', async () => {
        attachmentService.getter.bulkGetForDeletion.mockResolvedValue([parent]);
        relatedArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(
          bulkDeleteAttachments({ caseId, savedObjectIds: ['parent-1'] }, relatedArgs)
        ).rejects.toThrow();

        expect(getRelated).not.toHaveBeenCalled();
        expect(attachmentService.bulkDelete).not.toHaveBeenCalled();
      });

      it('deletes nothing when removing the related ids fails', async () => {
        attachmentService.getter.bulkGetForDeletion.mockResolvedValue([parent]);
        attachmentService.getter.getCaseAttachmentsForDeletion.mockResolvedValue([]);

        await expect(
          bulkDeleteAttachments({ caseId, savedObjectIds: ['parent-1'] }, relatedArgs)
        ).rejects.toThrow('alert-1');

        expect(attachmentService.bulkDelete).not.toHaveBeenCalled();
      });
    });

    describe('errors', () => {
      it(`throws when trying to delete more than ${MAX_BULK_DELETE_ATTACHMENTS} attachments at a time`, async () => {
        const savedObjectIds = new Array(MAX_BULK_DELETE_ATTACHMENTS + 1)
          .fill('id')
          .map((id, index) => `${id}-${index}`);

        await expect(
          bulkDeleteAttachments({ caseId: 'mock-id-1', savedObjectIds }, clientArgs)
        ).rejects.toThrow(
          `Failed to bulk delete attachments for case: mock-id-1: Error: ids: The length of the field ids is too long. Array must be of length <= ${MAX_BULK_DELETE_ATTACHMENTS}`
        );
      });

      it('throws when the ids are empty', async () => {
        await expect(
          bulkDeleteAttachments({ caseId: 'mock-id-1', savedObjectIds: [] }, clientArgs)
        ).rejects.toThrow(
          'Failed to bulk delete attachments for case: mock-id-1: Error: ids: The length of the field ids is too short. Array must be of length >= 1'
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
        'Failed to delete file attachments for case: mock-id: Error: ids: The length of the field ids is too long. Array must be of length <= 10'
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
          ids: ['file-attachment-1'],
          attachmentType: 'externalReference',
          owner: 'securitySolution',
        }
      );
    });

    it('only emits the event for the file attachments confirmed deleted', async () => {
      clientArgs.services.attachmentService.getter.getFileAttachmentsForDeletion.mockResolvedValue([
        fileAttachment,
        { ...fileAttachment, id: 'file-attachment-2' },
      ]);
      clientArgs.services.attachmentService.bulkDelete.mockResolvedValueOnce(['file-attachment-2']);

      await expect(deleteFileAttachments()).rejects.toThrow(
        'Failed to delete attachment file-attachment-1 on case mock-id-1.'
      );

      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledTimes(1);
      expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
        clientArgs.request,
        {
          caseId,
          ids: ['file-attachment-2'],
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
