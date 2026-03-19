/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment, actionComment, mockCases, mockCaseUnifiedAttachments } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import {
  MAX_COMMENT_LENGTH,
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_USER_ACTIONS_PER_CASE,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { EVENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { bulkCreate } from './bulk_create';
import {
  createAttachmentServiceMock,
  createCaseServiceMock,
  createUserActionServiceMock,
} from '../../services/mocks';
import { commentAttachmentType } from '../../attachment_framework/attachments';

describe('bulkCreate', () => {
  const caseId = 'test-case';

  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();
  const userActionService = createUserActionServiceMock();
  const caseService = createCaseServiceMock();
  const attachmentService = createAttachmentServiceMock();

  clientArgs.services.userActionService = userActionService;
  clientArgs.services.caseService = caseService;
  clientArgs.services.attachmentService = attachmentService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      bulkCreate({ attachments: [{ ...comment, foo: 'bar' }], caseId }, clientArgs, casesClient)
    ).rejects.toThrow('invalid keys "foo"');
  });

  it(`throws error when attachments are more than ${MAX_BULK_CREATE_ATTACHMENTS}`, async () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(comment);

    await expect(bulkCreate({ attachments, caseId }, clientArgs, casesClient)).rejects.toThrow(
      `The length of the field attachments is too long. Array must be of length <= ${MAX_BULK_CREATE_ATTACHMENTS}.`
    );
  });

  it(`throws error when the case user actions become > ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [caseId]: MAX_USER_ACTIONS_PER_CASE - 1,
    });

    await expect(
      bulkCreate({ attachments: [comment, comment], caseId }, clientArgs, casesClient)
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
        bulkCreate(
          { attachments: [{ ...comment, comment: longComment }], caseId },
          clientArgs,
          casesClient
        )
      ).rejects.toThrow(
        `Failed while bulk creating attachment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...comment, comment: '' }], caseId }, clientArgs, casesClient)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate(
          { attachments: [{ ...comment, comment: '  ' }], caseId },
          clientArgs,
          casesClient
        )
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
          clientArgs,
          casesClient
        )
      ).rejects.toThrow(
        `Failed while bulk creating attachment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate(
          { attachments: [{ ...actionComment, comment: '' }], caseId },
          clientArgs,
          casesClient
        )
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate(
          { attachments: [{ ...actionComment, comment: '  ' }], caseId },
          clientArgs,
          casesClient
        )
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
      { type: 'comment' as const, data: { content: 'first' }, owner: SECURITY_SOLUTION_OWNER },
      { type: 'comment' as const, data: { content: 'second' }, owner: SECURITY_SOLUTION_OWNER },
    ];

    await expect(
      bulkCreate({ attachments: unifiedAttachments, caseId }, clientArgs, casesClient)
    ).resolves.toBeDefined();

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({ owner: SECURITY_SOLUTION_OWNER }),
        ]),
      })
    );
  });

  describe('event attachments (fetch-based observables)', () => {
    it('adds observables from fetched event document and dummy when creating', async () => {
      clientArgs.unifiedAttachmentTypeRegistry.register({
        id: EVENT_ATTACHMENT_TYPE,
        schemaValidator: (metadata: unknown) => {
          if (metadata != null && typeof metadata === 'object') {
            const m = metadata as Record<string, unknown>;
            if (m.index != null && typeof m.index !== 'string') {
              throw new Error('metadata.index must be a string');
            }
          }
        },
      });
      userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

      const theCase = { ...mockCases[0], id: caseId };
      caseService.getCase.mockResolvedValue(theCase);
      caseService.patchCase.mockResolvedValue(theCase);
      caseService.getAllCaseComments.mockResolvedValue({
        saved_objects: [],
        total: 1,
        per_page: 1,
        page: 1,
      });
      attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
      );
      attachmentService.bulkCreate.mockResolvedValue({
        saved_objects: [mockCaseUnifiedAttachments[0]],
      });
      casesClient.cases.bulkAddObservables.mockResolvedValue(theCase as never);

      (clientArgs.esClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'ev-123',
              _index: 'logs-*',
              fields: {
                'host.name': ['test-host.example.com'],
                'source.ip': ['192.168.1.1'],
              },
            },
          ],
        },
      });

      const eventAttachment = {
        type: EVENT_ATTACHMENT_TYPE as const,
        attachmentId: 'ev-123',
        metadata: { index: 'logs-*' },
        owner: SECURITY_SOLUTION_OWNER,
      };

      await bulkCreate({ attachments: [eventAttachment], caseId }, clientArgs, casesClient);

      expect(clientArgs.esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'logs-*',
          query: { ids: { values: ['ev-123'] } },
        })
      );
      expect(casesClient.cases.bulkAddObservables).toHaveBeenCalledWith({
        caseId,
        observables: expect.arrayContaining([
          expect.objectContaining({
            typeKey: 'observable-type-hostname',
            value: 'dummy-from-event-registry',
            description: 'Dummy observable (event attachment type)',
          }),
          expect.objectContaining({
            typeKey: 'observable-type-hostname',
            value: 'test-host.example.com',
          }),
          expect.objectContaining({
            typeKey: 'observable-type-ipv4',
            value: '192.168.1.1',
          }),
        ]),
      });
    });
  });
});
