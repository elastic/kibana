/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertAttachmentAttributes } from '../../../common/types/domain';
import { AttachmentType } from '../../../common/types/domain';
import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import { createCasesClientMockArgs } from '../../client/mocks';
import { alertComment, comment, mockCaseComments, mockCases, multipleAlert } from '../../mocks';
import { CaseCommentModel } from './case_with_comments';
import {
  MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import {
  commentExternalReference,
  commentFileExternalReference,
  commentPersistableState,
} from '../../client/cases/mock';

describe('CaseCommentModel', () => {
  const theCase = mockCases[0];
  const clientArgs = createCasesClientMockArgs();
  const createdDate = '2023-04-07T12:18:36.941Z';

  clientArgs.services.caseService.getCase.mockResolvedValue(theCase);
  clientArgs.services.caseService.patchCase.mockResolvedValue(theCase);
  clientArgs.services.attachmentService.create.mockResolvedValue(mockCaseComments[0]);
  clientArgs.services.attachmentService.update.mockResolvedValue(mockCaseComments[0]);
  clientArgs.services.attachmentService.bulkCreate.mockResolvedValue({
    saved_objects: mockCaseComments,
  });

  const alertIdsAttachedToCase = new Set(['test-id-4']);
  clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValue(
    alertIdsAttachedToCase
  );

  let model: CaseCommentModel;

  beforeAll(async () => {
    model = await CaseCommentModel.create(theCase.id, clientArgs);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('does not remove comments when filtering out duplicate alerts', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: comment,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "attributes": Object {
                "comment": "a comment",
                "created_at": "2023-04-07T12:18:36.941Z",
                "created_by": Object {
                  "email": "damaged_raccoon@elastic.co",
                  "full_name": "Damaged Raccoon",
                  "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "username": "damaged_raccoon",
                },
                "owner": "securitySolution",
                "pushed_at": null,
                "pushed_by": null,
                "type": "user",
                "updated_at": null,
                "updated_by": null,
              },
              "id": "comment-1",
              "references": Array [
                Object {
                  "id": "mock-id-1",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
              "refresh": false,
            },
          ],
        ]
      `);
    });

    it('does not remove alerts not attached to the case', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: alertComment,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "attributes": Object {
                "alertId": Array [
                  "alert-id-1",
                ],
                "created_at": "2023-04-07T12:18:36.941Z",
                "created_by": Object {
                  "email": "damaged_raccoon@elastic.co",
                  "full_name": "Damaged Raccoon",
                  "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "username": "damaged_raccoon",
                },
                "index": Array [
                  "alert-index-1",
                ],
                "owner": "securitySolution",
                "pushed_at": null,
                "pushed_by": null,
                "rule": Object {
                  "id": "rule-id-1",
                  "name": "rule-name-1",
                },
                "type": "alert",
                "updated_at": null,
                "updated_by": null,
              },
              "id": "comment-1",
              "references": Array [
                Object {
                  "id": "mock-id-1",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
              "refresh": false,
            },
          ],
        ]
      `);
    });

    it('remove alerts attached to the case', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: multipleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "attributes": Object {
                "alertId": Array [
                  "test-id-3",
                  "test-id-5",
                ],
                "created_at": "2023-04-07T12:18:36.941Z",
                "created_by": Object {
                  "email": "damaged_raccoon@elastic.co",
                  "full_name": "Damaged Raccoon",
                  "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "username": "damaged_raccoon",
                },
                "index": Array [
                  "test-index-3",
                  "test-index-5",
                ],
                "owner": "securitySolution",
                "pushed_at": null,
                "pushed_by": null,
                "rule": Object {
                  "id": "rule-id-1",
                  "name": "rule-name-1",
                },
                "type": "alert",
                "updated_at": null,
                "updated_by": null,
              },
              "id": "comment-1",
              "references": Array [
                Object {
                  "id": "mock-id-1",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
              "refresh": false,
            },
          ],
        ]
      `);
    });

    it('remove multiple alerts', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-5'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: multipleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "attributes": Object {
                "alertId": Array [
                  "test-id-4",
                ],
                "created_at": "2023-04-07T12:18:36.941Z",
                "created_by": Object {
                  "email": "damaged_raccoon@elastic.co",
                  "full_name": "Damaged Raccoon",
                  "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "username": "damaged_raccoon",
                },
                "index": Array [
                  "test-index-4",
                ],
                "owner": "securitySolution",
                "pushed_at": null,
                "pushed_by": null,
                "rule": Object {
                  "id": "rule-id-1",
                  "name": "rule-name-1",
                },
                "type": "alert",
                "updated_at": null,
                "updated_by": null,
              },
              "id": "comment-1",
              "references": Array [
                Object {
                  "id": "mock-id-1",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
              "refresh": false,
            },
          ],
        ]
      `);
    });

    it('does not create attachments if all alerts are attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-4', 'test-id-5'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: multipleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create).not.toHaveBeenCalled();
    });

    it('does not create attachments if the alert is attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['alert-id-1'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: alertComment,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create).not.toHaveBeenCalled();
    });

    it('partial updates the case', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: comment,
        createdDate,
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.version).toBeUndefined();
    });

    describe('validation', () => {
      clientArgs.services.attachmentService.countPersistableStateAndExternalReferenceAttachments.mockResolvedValue(
        MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES
      );

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('throws if limit is reached when creating persistable state attachment', async () => {
        await expect(
          model.createComment({
            id: 'comment-1',
            commentReq: commentPersistableState,
            createdDate,
          })
        ).rejects.toThrow(
          `Case has reached the maximum allowed number (${MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES}) of attached persistable state and external reference attachments.`
        );
      });

      it('throws if limit is reached when creating external reference', async () => {
        await expect(
          model.createComment({
            id: 'comment-1',
            commentReq: commentExternalReference,
            createdDate,
          })
        ).rejects.toThrow(
          `Case has reached the maximum allowed number (${MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES}) of attached persistable state and external reference attachments.`
        );
      });

      it('does not throw if creating a file external reference and the limit is reached', async () => {
        clientArgs.fileService.find.mockResolvedValue({ total: 0, files: [] });

        await expect(
          model.createComment({
            id: 'comment-1',
            commentReq: commentFileExternalReference,
            createdDate,
          })
        ).resolves.not.toThrow();
      });
    });
  });

  describe('bulkCreate', () => {
    it('does not remove user comments when filtering out duplicate alerts', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...comment,
          },
          {
            id: 'comment-2',
            ...alertComment,
          },
          {
            id: 'comment-3',
            ...multipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const singleAlertCall = attachments[1] as SavedObject<AlertAttachmentAttributes>;
      const multipleAlertsCall = attachments[2] as SavedObject<AlertAttachmentAttributes>;

      expect(attachments.length).toBe(3);
      expect(attachments[0].attributes.type).toBe('user');
      expect(attachments[1].attributes.type).toBe('alert');
      expect(attachments[2].attributes.type).toBe('alert');

      expect(singleAlertCall.attributes.alertId).toEqual(['alert-id-1']);
      expect(singleAlertCall.attributes.index).toEqual(['alert-index-1']);

      // test-id-4 is omitted because it is returned by getAllAlertIds, see the top of this file
      expect(multipleAlertsCall.attributes.alertId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.index).toEqual(['test-index-3', 'test-index-5']);
    });

    it('does not remove alerts not attached to the case', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...alertComment,
          },
        ],
      });

      const attachments = clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0]
        .attachments as Array<SavedObject<AlertAttachmentAttributes>>;

      expect(attachments.length).toBe(1);
      expect(attachments[0].attributes.type).toBe('alert');
      expect(attachments[0].attributes.alertId).toEqual(['alert-id-1']);
      expect(attachments[0].attributes.index).toEqual(['alert-index-1']);
    });

    it('remove alerts attached to the case', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...multipleAlert,
          },
        ],
      });

      const attachments = clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0]
        .attachments as Array<SavedObject<AlertAttachmentAttributes>>;

      expect(attachments.length).toBe(1);
      expect(attachments[0].attributes.type).toBe('alert');
      expect(attachments[0].attributes.alertId).toEqual(['test-id-3', 'test-id-5']);
      expect(attachments[0].attributes.index).toEqual(['test-index-3', 'test-index-5']);
    });

    it('remove multiple alerts', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-5'])
      );

      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...multipleAlert,
          },
        ],
      });

      const attachments = clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0]
        .attachments as Array<SavedObject<AlertAttachmentAttributes>>;

      expect(attachments.length).toBe(1);
      expect(attachments[0].attributes.type).toBe('alert');
      expect(attachments[0].attributes.alertId).toEqual(['test-id-4']);
      expect(attachments[0].attributes.index).toEqual(['test-index-4']);
    });

    it('does not create attachments if all alerts are attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-4', 'test-id-5'])
      );

      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...multipleAlert,
          },
        ],
      });

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('does not create attachments if the alert is attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-1'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: alertComment,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('remove alerts from multiple attachments', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...comment,
          },
          {
            id: 'comment-2',
            ...alertComment,
          },
          {
            id: 'comment-3',
            ...alertComment,
          },
          {
            id: 'comment-4',
            ...multipleAlert,
          },
          {
            id: 'comment-5',
            ...multipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const singleAlertCall = attachments[1] as SavedObject<AlertAttachmentAttributes>;
      const multipleAlertsCall = attachments[2] as SavedObject<AlertAttachmentAttributes>;

      expect(attachments.length).toBe(3);
      expect(attachments[0].attributes.type).toBe('user');
      expect(attachments[1].attributes.type).toBe('alert');
      expect(attachments[2].attributes.type).toBe('alert');

      expect(singleAlertCall.attributes.alertId).toEqual(['alert-id-1']);
      expect(singleAlertCall.attributes.index).toEqual(['alert-index-1']);

      expect(multipleAlertsCall.attributes.alertId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.index).toEqual(['test-index-3', 'test-index-5']);
    });

    it('remove alerts from multiple attachments on the same request', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...comment,
          },
          {
            id: 'comment-2',
            ...alertComment,
          },
          {
            id: 'comment-3',
            ...multipleAlert,
            alertId: ['alert-id-1', 'test-id-2'],
            index: ['alert-index-1', 'test-index-2'],
          },
          {
            id: 'comment-4',
            ...multipleAlert,
            alertId: ['test-id-2', 'test-id-4', 'test-id-5'],
            index: ['test-index-1', 'test-index-4', 'test-index-5'],
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const alertOne = attachments[1] as SavedObject<AlertAttachmentAttributes>;
      const alertTwo = attachments[2] as SavedObject<AlertAttachmentAttributes>;
      const alertThree = attachments[3] as SavedObject<AlertAttachmentAttributes>;

      expect(attachments.length).toBe(4);
      expect(attachments[0].attributes.type).toBe('user');
      expect(attachments[1].attributes.type).toBe('alert');
      expect(attachments[2].attributes.type).toBe('alert');
      expect(attachments[3].attributes.type).toBe('alert');

      expect(alertOne.attributes.alertId).toEqual(['alert-id-1']);
      expect(alertOne.attributes.index).toEqual(['alert-index-1']);

      expect(alertTwo.attributes.alertId).toEqual(['test-id-2']);
      expect(alertTwo.attributes.index).toEqual(['test-index-2']);

      // test-id-4 is omitted because it is returned by getAllAlertIds, see the top of this file
      expect(alertThree.attributes.alertId).toEqual(['test-id-5']);
      expect(alertThree.attributes.index).toEqual(['test-index-5']);
    });

    it('remove alerts from multiple attachments with multiple alerts attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['alert-id-1', 'test-id-4'])
      );
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...comment,
          },
          {
            id: 'comment-2',
            ...alertComment,
          },
          {
            id: 'comment-3',
            ...multipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const multipleAlertsCall = attachments[1] as SavedObject<AlertAttachmentAttributes>;

      expect(attachments.length).toBe(2);
      expect(attachments[0].attributes.type).toBe('user');
      expect(attachments[1].attributes.type).toBe('alert');

      expect(multipleAlertsCall.attributes.alertId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.index).toEqual(['test-index-3', 'test-index-5']);
    });

    it('partial updates the case', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...comment,
          },
        ],
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.version).toBeUndefined();
    });

    describe('validation', () => {
      clientArgs.services.attachmentService.countPersistableStateAndExternalReferenceAttachments.mockResolvedValue(
        MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES
      );

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('throws if limit is reached when creating persistable state attachment', async () => {
        await expect(
          model.bulkCreate({
            attachments: [commentPersistableState],
          })
        ).rejects.toThrow(
          `Case has reached the maximum allowed number (${MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES}) of attached persistable state and external reference attachments.`
        );
      });

      it('throws if limit is reached when creating external reference', async () => {
        await expect(
          model.bulkCreate({
            attachments: [commentExternalReference],
          })
        ).rejects.toThrow(
          `Case has reached the maximum allowed number (${MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES}) of attached persistable state and external reference attachments.`
        );
      });

      it('does not throw if creating a file external reference and the limit is reached', async () => {
        clientArgs.fileService.find.mockResolvedValue({ total: 0, files: [] });

        await expect(
          model.bulkCreate({
            attachments: [commentFileExternalReference],
          })
        ).resolves.not.toThrow();
      });
    });
  });

  describe('updateComment', () => {
    it('partial updates the case', async () => {
      await model.updateComment({
        updateRequest: {
          id: 'comment-id',
          version: 'comment-version',
          type: AttachmentType.user,
          comment: 'my updated comment',
          owner: SECURITY_SOLUTION_OWNER,
        },
        updatedAt: createdDate,
        owner: SECURITY_SOLUTION_OWNER,
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.version).toBeUndefined();
    });
  });
});
