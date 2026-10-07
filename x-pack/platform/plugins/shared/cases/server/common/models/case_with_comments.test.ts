/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../../client/mocks';
import { mockCaseComments, mockCases } from '../../mocks';
import { CaseCommentModel } from './case_with_comments';
import {
  MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import {
  COMMENT_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  OSQUERY_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';

// Unified request fixtures. `CaseCommentModel` only ever receives already-unified
// payloads (real callers convert legacy shapes before reaching this model), so these
// replace the legacy `alertId`/`eventId`/`comment` fixtures that used to live in
// `../../mocks` for this test file specifically.
const unifiedComment = {
  type: COMMENT_ATTACHMENT_TYPE,
  owner: SECURITY_SOLUTION_OWNER,
  data: { content: 'a comment' },
};

const unifiedAlertComment = {
  type: SECURITY_ALERT_ATTACHMENT_TYPE,
  owner: SECURITY_SOLUTION_OWNER,
  attachmentId: 'alert-id-1',
  metadata: {
    index: 'alert-index-1',
    rule: { id: 'rule-id-1', name: 'rule-name-1' },
  },
};

const unifiedEventComment = {
  type: SECURITY_EVENT_ATTACHMENT_TYPE,
  owner: SECURITY_SOLUTION_OWNER,
  attachmentId: 'event-id-1',
  metadata: { index: 'mock-index' },
};

const unifiedMultipleAlert = {
  ...unifiedAlertComment,
  attachmentId: ['test-id-3', 'test-id-4', 'test-id-5'],
  metadata: {
    ...unifiedAlertComment.metadata,
    index: ['test-index-3', 'test-index-4', 'test-index-5'],
  },
};

const unifiedPersistableState = {
  type: LENS_ATTACHMENT_TYPE,
  owner: SECURITY_SOLUTION_OWNER,
  data: { state: { foo: 'foo' } },
};

const unifiedExternalReference = {
  type: OSQUERY_ATTACHMENT_TYPE,
  owner: SECURITY_SOLUTION_OWNER,
  data: { query: 'select * from users' },
};

const unifiedFileExternalReference = {
  type: FILE_ATTACHMENT_TYPE,
  owner: SECURITY_SOLUTION_OWNER,
  attachmentId: 'file-id-1',
  metadata: {
    files: [
      {
        name: 'report.pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        created: '2019-11-25T21:55:00.177Z',
      },
    ],
  },
};

// Bulk-create mock args are typed as saved-object create args (attributes untyped);
// tests assert on the unified attributes shape instead of repeating this cast.
interface UnifiedAttachmentSOForTest {
  attributes: { type?: string; attachmentId: string[]; metadata: { index: string[] } };
}

const asUnifiedAttachmentSO = (attachment: unknown): UnifiedAttachmentSOForTest =>
  attachment as UnifiedAttachmentSOForTest;

describe('CaseCommentModel', () => {
  const theCase = mockCases[0];
  const closedCase = mockCases[3];

  const clientArgs = createCasesClientMockArgs();
  const createdDate = '2023-04-07T12:18:36.941Z';

  clientArgs.services.caseService.getCase.mockResolvedValue(theCase);
  clientArgs.services.caseService.patchCase.mockResolvedValue(theCase);
  clientArgs.services.attachmentService.create.mockResolvedValue(mockCaseComments[0]);
  clientArgs.services.attachmentService.update.mockResolvedValue(mockCaseComments[0]);
  clientArgs.services.attachmentService.getter.get.mockResolvedValue(mockCaseComments[0]);
  clientArgs.services.attachmentService.bulkCreate.mockResolvedValue({
    saved_objects: mockCaseComments,
  });
  clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(new Map());

  const alertIdsAttachedToCase = new Set(['test-id-4']);
  clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValue(
    alertIdsAttachedToCase
  );
  clientArgs.services.attachmentService.getter.getAllEventIds.mockResolvedValue(new Set());

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
        commentReq: unifiedComment,
        createdDate,
      });

      const [[createArgs]] = clientArgs.services.attachmentService.create.mock.calls;

      expect(createArgs.attributes).toMatchObject({
        type: COMMENT_ATTACHMENT_TYPE,
        data: { content: 'a comment' },
        owner: 'securitySolution',
      });
      expect(createArgs.id).toBe('comment-1');
      expect(createArgs.references).toEqual([
        { id: 'mock-id-1', name: 'associated-cases', type: 'cases' },
      ]);
    });

    it('does not remove alerts not attached to the case', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: unifiedAlertComment,
        createdDate,
      });

      const [[createArgs]] = clientArgs.services.attachmentService.create.mock.calls;

      expect(createArgs.attributes).toMatchObject({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-id-1'],
        metadata: {
          index: ['alert-index-1'],
          rule: { id: 'rule-id-1', name: 'rule-name-1' },
        },
        owner: 'securitySolution',
      });
      expect(createArgs.id).toBe('comment-1');
      expect(createArgs.references).toEqual([
        { id: 'mock-id-1', name: 'associated-cases', type: 'cases' },
      ]);
    });

    it('remove alerts attached to the case', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: unifiedMultipleAlert,
        createdDate,
      });

      const [[createArgs]] = clientArgs.services.attachmentService.create.mock.calls;

      // test-id-4 is omitted because it is returned by getAllAlertIds, see the top of this file
      expect(createArgs.attributes).toMatchObject({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['test-id-3', 'test-id-5'],
        metadata: {
          index: ['test-index-3', 'test-index-5'],
          rule: { id: 'rule-id-1', name: 'rule-name-1' },
        },
        owner: 'securitySolution',
      });
    });

    it('remove multiple alerts', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-5'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: unifiedMultipleAlert,
        createdDate,
      });

      const [[createArgs]] = clientArgs.services.attachmentService.create.mock.calls;

      expect(createArgs.attributes).toMatchObject({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['test-id-4'],
        metadata: {
          index: ['test-index-4'],
          rule: { id: 'rule-id-1', name: 'rule-name-1' },
        },
        owner: 'securitySolution',
      });
    });

    it('does not create attachments if all alerts are attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-4', 'test-id-5'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: unifiedMultipleAlert,
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
        commentReq: unifiedAlertComment,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create).not.toHaveBeenCalled();
    });

    it('partial updates the case', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: unifiedComment,
        createdDate,
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.version).toBeUndefined();
    });

    it('updates the total number of comments correctly', async () => {
      // user comment
      clientArgs.services.attachmentService.create.mockResolvedValue(mockCaseComments[0]);

      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([
          [
            'mock-id-1',
            {
              userComments: 2,
              alerts: 2,
              events: 0,
            },
          ],
        ])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: unifiedComment,
        createdDate,
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.updatedAttributes.total_comments).toEqual(2);
      expect(args.updatedAttributes.total_alerts).toEqual(2);
    });

    it('updates the total number of alerts correctly', async () => {
      // alert comment
      clientArgs.services.attachmentService.create.mockResolvedValue(mockCaseComments[3]);

      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([
          [
            'mock-id-1',
            {
              userComments: 1,
              alerts: 3,
              events: 0,
            },
          ],
        ])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: unifiedAlertComment,
        createdDate,
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.updatedAttributes.total_alerts).toEqual(3);
      expect(args.updatedAttributes.total_comments).toEqual(1);
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
            commentReq: unifiedPersistableState,
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
            commentReq: unifiedExternalReference,
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
            commentReq: unifiedFileExternalReference,
            createdDate,
          })
        ).resolves.not.toThrow();
      });

      it('throws if trying to add an event or alert to a closed case', async () => {
        expect(closedCase.attributes.status).toEqual(CaseStatuses.closed);
        clientArgs.services.caseService.getCase.mockResolvedValue(closedCase);

        const modelForClosedCase = await CaseCommentModel.create(closedCase.id, clientArgs);

        await expect(
          modelForClosedCase.createComment({
            id: 'comment-1',
            commentReq: unifiedAlertComment,
            createdDate,
          })
        ).rejects.toThrow('Alert cannot be attached to a closed case');

        await expect(
          modelForClosedCase.createComment({
            id: 'comment-1',
            commentReq: unifiedEventComment,
            createdDate,
          })
        ).rejects.toThrow('Event cannot be attached to a closed case');
      });
    });
  });

  describe('bulkCreate', () => {
    it('does not remove user comments when filtering out duplicate alerts', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedComment,
          },
          {
            id: 'comment-2',
            ...unifiedAlertComment,
          },
          {
            id: 'comment-3',
            ...unifiedMultipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const singleAlertCall = asUnifiedAttachmentSO(attachments[1]);
      const multipleAlertsCall = asUnifiedAttachmentSO(attachments[2]);

      expect(attachments.length).toBe(3);
      expect(attachments[0].attributes.type).toBe(COMMENT_ATTACHMENT_TYPE);
      expect(attachments[1].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
      expect(attachments[2].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);

      expect(singleAlertCall.attributes.attachmentId).toEqual(['alert-id-1']);
      expect(singleAlertCall.attributes.metadata.index).toEqual(['alert-index-1']);

      // test-id-4 is omitted because it is returned by getAllAlertIds, see the top of this file
      expect(multipleAlertsCall.attributes.attachmentId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.metadata.index).toEqual([
        'test-index-3',
        'test-index-5',
      ]);
    });

    it('does not remove events when filtering out duplicate alerts', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedEventComment,
          },
          {
            id: 'comment-2',
            ...unifiedAlertComment,
          },
          {
            id: 'comment-3',
            ...unifiedMultipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const singleAlertCall = asUnifiedAttachmentSO(attachments[1]);
      const multipleAlertsCall = asUnifiedAttachmentSO(attachments[2]);

      expect(attachments.length).toBe(3);
      expect(attachments[0].attributes.type).toBe(SECURITY_EVENT_ATTACHMENT_TYPE);
      expect(attachments[1].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
      expect(attachments[2].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);

      expect(singleAlertCall.attributes.attachmentId).toEqual(['alert-id-1']);
      expect(singleAlertCall.attributes.metadata.index).toEqual(['alert-index-1']);

      // test-id-4 is omitted because it is returned by getAllAlertIds, see the top of this file
      expect(multipleAlertsCall.attributes.attachmentId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.metadata.index).toEqual([
        'test-index-3',
        'test-index-5',
      ]);
    });

    it('dedupes event ids that repeat within the same bulk create batch', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            type: SECURITY_EVENT_ATTACHMENT_TYPE,
            owner: SECURITY_SOLUTION_OWNER,
            attachmentId: ['event-id-1', 'event-id-2'],
            metadata: { index: ['idx-1', 'idx-2'] },
          },
          {
            id: 'comment-2',
            type: SECURITY_EVENT_ATTACHMENT_TYPE,
            owner: SECURITY_SOLUTION_OWNER,
            attachmentId: ['event-id-2', 'event-id-3'],
            metadata: { index: ['idx-2', 'idx-3'] },
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      expect(attachments.length).toBe(2);
      const first = asUnifiedAttachmentSO(attachments[0]);
      const second = asUnifiedAttachmentSO(attachments[1]);

      expect(first.attributes.attachmentId).toEqual(['event-id-1', 'event-id-2']);
      expect(first.attributes.metadata.index).toEqual(['idx-1', 'idx-2']);
      // event-id-2 is dropped from the second attachment because the first one already claimed it
      expect(second.attributes.attachmentId).toEqual(['event-id-3']);
      expect(second.attributes.metadata.index).toEqual(['idx-3']);
    });

    it('drops the unified event attachment entirely when every id is already attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllEventIds.mockResolvedValueOnce(
        new Set(['event-id-1', 'event-id-2'])
      );

      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            type: SECURITY_EVENT_ATTACHMENT_TYPE,
            owner: SECURITY_SOLUTION_OWNER,
            attachmentId: ['event-id-1', 'event-id-2'],
            metadata: { index: ['idx-1', 'idx-2'] },
          },
        ],
      });

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('drops only matching ids from a unified (v2) event attachment', async () => {
      clientArgs.services.attachmentService.getter.getAllEventIds.mockResolvedValueOnce(
        new Set(['event-id-2'])
      );

      const unifiedMultipleEvent = {
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        owner: SECURITY_SOLUTION_OWNER,
        attachmentId: ['event-id-1', 'event-id-2', 'event-id-3'],
        metadata: {
          index: ['idx-1', 'idx-2', 'idx-3'],
        },
      };

      await model.bulkCreate({
        attachments: [{ id: 'comment-1', ...unifiedMultipleEvent } as never],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      expect(attachments.length).toBe(1);
      const unifiedCall = asUnifiedAttachmentSO(attachments[0]);
      expect(unifiedCall.attributes.attachmentId).toEqual(['event-id-1', 'event-id-3']);
      expect(unifiedCall.attributes.metadata.index).toEqual(['idx-1', 'idx-3']);
    });

    it('rejects a unified (v2) event attachment when metadata.index is an array of mismatched length', async () => {
      const unifiedEventWithMismatchedIndex = {
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        owner: SECURITY_SOLUTION_OWNER,
        attachmentId: ['event-id-1', 'event-id-2', 'event-id-3'],
        metadata: {
          index: ['idx-1', 'idx-2'],
        },
      };

      await expect(
        model.bulkCreate({
          attachments: [{ id: 'comment-1', ...unifiedEventWithMismatchedIndex } as never],
        })
      ).rejects.toThrow(
        'attachmentId and metadata.index must have matching lengths when metadata.index is an array'
      );

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('broadcasts a scalar metadata.index to match array attachmentId of a unified (v2) event attachment', async () => {
      // `attachmentId` is always normalized to an array (see `newIds` above); `metadata.index`
      // must stay symmetric with it instead of leaking a lone scalar into the persisted shape.
      const unifiedEventWithScalarIndex = {
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        owner: SECURITY_SOLUTION_OWNER,
        attachmentId: ['event-id-1', 'event-id-2', 'event-id-3'],
        metadata: {
          index: 'test-events-index',
        },
      };

      await model.bulkCreate({
        attachments: [{ id: 'comment-1', ...unifiedEventWithScalarIndex } as never],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      expect(attachments.length).toBe(1);
      const unifiedCall = asUnifiedAttachmentSO(attachments[0]);
      expect(unifiedCall.attributes.attachmentId).toEqual([
        'event-id-1',
        'event-id-2',
        'event-id-3',
      ]);
      expect(unifiedCall.attributes.metadata.index).toEqual([
        'test-events-index',
        'test-events-index',
        'test-events-index',
      ]);
    });

    it('does not remove alerts not attached to the case', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedAlertComment,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments.map(
          asUnifiedAttachmentSO
        );

      expect(attachments.length).toBe(1);
      expect(attachments[0].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
      expect(attachments[0].attributes.attachmentId).toEqual(['alert-id-1']);
      expect(attachments[0].attributes.metadata.index).toEqual(['alert-index-1']);
    });

    it('remove multiple alerts', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-5'])
      );

      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedMultipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments.map(
          asUnifiedAttachmentSO
        );

      expect(attachments.length).toBe(1);
      expect(attachments[0].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
      expect(attachments[0].attributes.attachmentId).toEqual(['test-id-4']);
      expect(attachments[0].attributes.metadata.index).toEqual(['test-index-4']);
    });

    it('does not create attachments if the alert is attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['alert-id-1'])
      );

      await model.bulkCreate({
        attachments: [{ id: 'comment-1', ...unifiedAlertComment }],
      });

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('remove alerts from multiple attachments', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedComment,
          },
          {
            id: 'comment-2',
            ...unifiedAlertComment,
          },
          {
            id: 'comment-3',
            ...unifiedAlertComment,
          },
          {
            id: 'comment-4',
            ...unifiedMultipleAlert,
          },
          {
            id: 'comment-5',
            ...unifiedMultipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const singleAlertCall = asUnifiedAttachmentSO(attachments[1]);
      const multipleAlertsCall = asUnifiedAttachmentSO(attachments[2]);

      expect(attachments.length).toBe(3);
      expect(attachments[0].attributes.type).toBe(COMMENT_ATTACHMENT_TYPE);
      expect(attachments[1].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
      expect(attachments[2].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);

      expect(singleAlertCall.attributes.attachmentId).toEqual(['alert-id-1']);
      expect(singleAlertCall.attributes.metadata.index).toEqual(['alert-index-1']);

      expect(multipleAlertsCall.attributes.attachmentId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.metadata.index).toEqual([
        'test-index-3',
        'test-index-5',
      ]);
    });

    it('remove alerts from multiple attachments on the same request', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedComment,
          },
          {
            id: 'comment-2',
            ...unifiedAlertComment,
          },
          {
            id: 'comment-3',
            ...unifiedMultipleAlert,
            attachmentId: ['alert-id-1', 'test-id-2'],
            metadata: {
              ...unifiedMultipleAlert.metadata,
              index: ['alert-index-1', 'test-index-2'],
            },
          },
          {
            id: 'comment-4',
            ...unifiedMultipleAlert,
            attachmentId: ['test-id-2', 'test-id-4', 'test-id-5'],
            metadata: {
              ...unifiedMultipleAlert.metadata,
              index: ['test-index-1', 'test-index-4', 'test-index-5'],
            },
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const alertOne = asUnifiedAttachmentSO(attachments[1]);
      const alertTwo = asUnifiedAttachmentSO(attachments[2]);
      const alertThree = asUnifiedAttachmentSO(attachments[3]);

      expect(attachments.length).toBe(4);
      expect(attachments[0].attributes.type).toBe(COMMENT_ATTACHMENT_TYPE);
      expect(attachments[1].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
      expect(attachments[2].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
      expect(attachments[3].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);

      expect(alertOne.attributes.attachmentId).toEqual(['alert-id-1']);
      expect(alertOne.attributes.metadata.index).toEqual(['alert-index-1']);

      expect(alertTwo.attributes.attachmentId).toEqual(['test-id-2']);
      expect(alertTwo.attributes.metadata.index).toEqual(['test-index-2']);

      // test-id-4 is omitted because it is returned by getAllAlertIds, see the top of this file
      expect(alertThree.attributes.attachmentId).toEqual(['test-id-5']);
      expect(alertThree.attributes.metadata.index).toEqual(['test-index-5']);
    });

    it('filters duplicate ids from unified (v2) alert attachments while preserving order', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-4'])
      );

      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedMultipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      expect(attachments.length).toBe(1);
      const unifiedCall = asUnifiedAttachmentSO(attachments[0]);
      // test-id-4 was already on the case → must be filtered out from both attachmentId and metadata.index
      expect(unifiedCall.attributes.attachmentId).toEqual(['test-id-3', 'test-id-5']);
      expect(unifiedCall.attributes.metadata.index).toEqual(['test-index-3', 'test-index-5']);
    });

    it('drops the unified alert attachment entirely when every id is already attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-4', 'test-id-5'])
      );

      const unifiedAllDuplicates = {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        owner: SECURITY_SOLUTION_OWNER,
        attachmentId: ['test-id-3', 'test-id-4', 'test-id-5'],
        metadata: {
          index: ['test-index-3', 'test-index-4', 'test-index-5'],
          rule: { id: 'rule-id-1', name: 'rule-name-1' },
        },
      };

      await model.bulkCreate({
        attachments: [{ id: 'comment-1', ...unifiedAllDuplicates } as never],
      });

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('remove alerts from multiple attachments with multiple alerts attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['alert-id-1', 'test-id-4'])
      );
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedComment,
          },
          {
            id: 'comment-2',
            ...unifiedAlertComment,
          },
          {
            id: 'comment-3',
            ...unifiedMultipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const multipleAlertsCall = asUnifiedAttachmentSO(attachments[1]);

      expect(attachments.length).toBe(2);
      expect(attachments[0].attributes.type).toBe(COMMENT_ATTACHMENT_TYPE);
      expect(attachments[1].attributes.type).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);

      expect(multipleAlertsCall.attributes.attachmentId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.metadata.index).toEqual([
        'test-index-3',
        'test-index-5',
      ]);
    });

    it('partial updates the case', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...unifiedComment,
          },
        ],
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.version).toBeUndefined();
    });

    it('updates the total number of comments and alerts correctly', async () => {
      clientArgs.services.attachmentService.bulkCreate.mockResolvedValue({
        saved_objects: mockCaseComments,
      });

      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([
          [
            'mock-id-1',
            {
              userComments: 4,
              alerts: 5,
              events: 0,
            },
          ],
        ])
      );

      await model.bulkCreate({
        attachments: [
          {
            id: 'mock-comment-1',
            ...unifiedComment,
          },
          {
            id: 'mock-comment-2',
            ...unifiedComment,
          },
          {
            id: 'mock-comment-3',
            ...unifiedComment,
          },
          {
            id: 'mock-comment-4',
            ...unifiedAlertComment,
          },
          {
            id: 'mock-comment-5',
            ...unifiedAlertComment,
          },
          {
            id: 'mock-comment-6',
            ...unifiedAlertComment,
          },
        ],
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.updatedAttributes.total_alerts).toEqual(5);
      expect(args.updatedAttributes.total_comments).toEqual(4);
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
            attachments: [{ id: 'comment-1', ...unifiedPersistableState }],
          })
        ).rejects.toThrow(
          `Case has reached the maximum allowed number (${MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES}) of attached persistable state and external reference attachments.`
        );
      });

      it('throws if limit is reached when creating external reference', async () => {
        await expect(
          model.bulkCreate({ attachments: [{ id: 'comment-1', ...unifiedExternalReference }] })
        ).rejects.toThrow(
          `Case has reached the maximum allowed number (${MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES}) of attached persistable state and external reference attachments.`
        );
      });

      it('does not throw if creating a file external reference and the limit is reached', async () => {
        clientArgs.fileService.find.mockResolvedValue({ total: 0, files: [] });

        await expect(
          model.bulkCreate({
            attachments: [{ id: 'comment-1', ...unifiedFileExternalReference }],
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
          ...unifiedComment,
        },
        updatedAt: createdDate,
        owner: SECURITY_SOLUTION_OWNER,
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.version).toBeUndefined();
    });

    it('does not increase the counters when updating a user comment', async () => {
      // the case has 1 user comment and 2 alert comments
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([
          [
            'mock-id-1',
            {
              userComments: 1,
              alerts: 2,
              events: 0,
            },
          ],
        ])
      );

      await model.updateComment({
        updateRequest: {
          id: 'comment-id',
          version: 'comment-version',
          ...unifiedComment,
        },
        updatedAt: createdDate,
        owner: SECURITY_SOLUTION_OWNER,
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.updatedAttributes.total_alerts).toEqual(2);
      expect(args.updatedAttributes.total_comments).toEqual(1);
    });

    it('does not increase the counters when updating an alert', async () => {
      // the case has 1 user comment and 2 alert comments
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([
          [
            'mock-id-1',
            {
              userComments: 1,
              alerts: 2,
              events: 0,
            },
          ],
        ])
      );

      await model.updateComment({
        updateRequest: {
          id: 'comment-id',
          version: 'comment-version',
          ...unifiedAlertComment,
        },
        updatedAt: createdDate,
        owner: SECURITY_SOLUTION_OWNER,
      });

      const args = clientArgs.services.caseService.patchCase.mock.calls[0][0];

      expect(args.updatedAttributes.total_alerts).toEqual(2);
      expect(args.updatedAttributes.total_comments).toEqual(1);
    });

    it('does not treat a unified security.endpoint payload as a comment attachment', async () => {
      // `security.endpoint` also has a `data.content` field but is not Lens-reference-eligible
      // (only the unified `comment` type is) — guards against a too-loose `data.content` check.
      await expect(
        model.updateComment({
          updateRequest: {
            id: 'comment-id',
            version: 'comment-version',
            type: 'security.endpoint',
            owner: SECURITY_SOLUTION_OWNER,
            attachmentId: 'legacy-actions',
            data: { content: 'Isolating this for investigation' },
            metadata: {
              command: 'isolate',
              targets: [{ endpointId: '123', hostname: 'windows-host-1' }],
            },
          },
          updatedAt: createdDate,
          owner: SECURITY_SOLUTION_OWNER,
        })
      ).resolves.not.toThrow();

      expect(clientArgs.services.attachmentService.getter.get).not.toHaveBeenCalled();
    });
  });

  describe('alert/event indexed-reference validation', () => {
    it('checks alert authorization before persisting the attachment (createComment)', async () => {
      clientArgs.services.alertsService.ensureAlertsAuthorized.mockRejectedValueOnce(
        new Error('not authorized')
      );

      await expect(
        model.createComment({
          id: 'comment-1',
          commentReq: unifiedAlertComment,
          createdDate,
        })
      ).rejects.toThrow('not authorized');

      expect(clientArgs.services.attachmentService.create).not.toHaveBeenCalled();
    });

    it('checks alert authorization before persisting the attachment batch (bulkCreate)', async () => {
      clientArgs.services.alertsService.ensureAlertsAuthorized.mockRejectedValueOnce(
        new Error('not authorized')
      );

      await expect(
        model.bulkCreate({
          attachments: [
            { id: 'comment-1', ...unifiedComment },
            { id: 'comment-2', ...unifiedAlertComment },
          ],
        })
      ).rejects.toThrow('not authorized');

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('checks event existence before persisting the attachment (createComment)', async () => {
      clientArgs.services.alertsService.ensureDocumentsExist.mockRejectedValueOnce(
        new Error('document not found')
      );

      await expect(
        model.createComment({
          id: 'comment-1',
          commentReq: unifiedEventComment,
          createdDate,
        })
      ).rejects.toThrow('document not found');

      expect(clientArgs.services.alertsService.ensureDocumentsExist).toHaveBeenCalledWith({
        alerts: [{ id: 'event-id-1', index: 'mock-index' }],
      });
      expect(clientArgs.services.attachmentService.create).not.toHaveBeenCalled();
    });

    it('checks event existence before persisting the attachment batch (bulkCreate)', async () => {
      clientArgs.services.alertsService.ensureDocumentsExist.mockRejectedValueOnce(
        new Error('document not found')
      );

      await expect(
        model.bulkCreate({
          attachments: [{ id: 'comment-1', ...unifiedEventComment }],
        })
      ).rejects.toThrow('document not found');

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('does not call ensureDocumentsExist for a batch with no event attachments', async () => {
      await model.bulkCreate({
        attachments: [{ id: 'comment-1', ...unifiedAlertComment }],
      });

      expect(clientArgs.services.alertsService.ensureDocumentsExist).not.toHaveBeenCalled();
    });

    it('does not call ensureAlertsAuthorized for a batch with no alert attachments', async () => {
      await model.bulkCreate({
        attachments: [{ id: 'comment-1', ...unifiedEventComment }],
      });

      expect(clientArgs.services.alertsService.ensureAlertsAuthorized).not.toHaveBeenCalled();
    });

    it('validates alert authorization before the saved object is created', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: unifiedAlertComment,
        createdDate,
      });

      const authorizeOrder =
        clientArgs.services.alertsService.ensureAlertsAuthorized.mock.invocationCallOrder[0];
      const createOrder = clientArgs.services.attachmentService.create.mock.invocationCallOrder[0];

      expect(authorizeOrder).toBeLessThan(createOrder);
    });
  });
});
