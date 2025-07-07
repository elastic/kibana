/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCaseComments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { deleteComment, deleteAll } from './delete';

describe('delete', () => {
  describe('deleteComment', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();

      clientArgs.services.attachmentService.getter.get.mockResolvedValue(mockCaseComments[0]);
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map()
      );
    });

    it('refreshes when deleting', async () => {
      await deleteComment({ caseID: 'mock-id-1', attachmentID: 'mock-comment-1' }, clientArgs);

      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        attachmentIds: ['mock-comment-1'],
        refresh: true,
      });
    });

    describe('Alerts', () => {
      const commentSO = mockCaseComments[0];
      const alertsSO = mockCaseComments[3];

      beforeEach(() => {
        clientArgs.services.attachmentService.getter.get.mockResolvedValue(alertsSO);
      });

      it('delete alerts correctly', async () => {
        await deleteComment({ caseID: 'mock-id-4', attachmentID: 'mock-comment-4' }, clientArgs);

        expect(clientArgs.services.alertsService.removeCaseIdFromAlerts).toHaveBeenCalledWith({
          alerts: [{ id: 'test-id', index: 'test-index' }],
          caseId: 'mock-id-4',
        });
      });

      it('does not call the alert service when the attachment is not an alert', async () => {
        clientArgs.services.attachmentService.getter.get.mockResolvedValue(commentSO);
        await deleteComment({ caseID: 'mock-id-1', attachmentID: 'mock-comment-1' }, clientArgs);

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
                userComments: 2,
                alerts: 2,
              },
            ],
          ])
        );

        await deleteComment({ caseID: 'mock-id-1', attachmentID: 'mock-comment-1' }, clientArgs);

        const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

        expect(args.updatedAttributes.total_comments).toEqual(2);
        expect(args.updatedAttributes.total_alerts).toEqual(2);
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

  describe('deleteAll', () => {
    const clientArgs = createCasesClientMockArgs();

    const getAllCaseCommentsResponse = {
      saved_objects: mockCaseComments.map((so) => ({ ...so, score: 0 })),
      total: mockCaseComments.length,
      page: 1,
      per_page: mockCaseComments.length,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();

      clientArgs.services.attachmentService.getter.get.mockResolvedValue(mockCaseComments[0]);
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map()
      );

      clientArgs.services.caseService.getAllCaseComments.mockResolvedValue(
        getAllCaseCommentsResponse
      );
    });

    it('refreshes when deleting', async () => {
      await deleteAll({ caseID: 'mock-id-1' }, clientArgs);

      expect(clientArgs.services.attachmentService.bulkDelete).toHaveBeenCalledWith({
        attachmentIds: [
          'mock-comment-1',
          'mock-comment-2',
          'mock-comment-3',
          'mock-comment-4',
          'mock-comment-5',
          'mock-comment-6',
          'mock-comment-7',
        ],
        refresh: true,
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
});
