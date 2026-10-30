/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';
import {
  GENERAL_CASES_OWNER,
  MAX_USER_ACTIONS_PER_CASE,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { STACK_ALERT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { mockCases, mockCaseUnifiedAttachments } from '../../mocks';
import {
  createAttachmentServiceMock,
  createCaseServiceMock,
  createUserActionServiceMock,
} from '../../services/mocks';
import { createCasesClientMockArgs } from '../mocks';
import {
  commentAttachmentType,
  stackAlertAttachmentType,
} from '../../attachment_framework/attachments';
import { addComment, addCommentAndGetCase } from './add';

describe('addComment', () => {
  const caseId = 'test-case';
  const unifiedComment = {
    type: 'comment' as const,
    data: { content: 'unified text' },
    owner: SECURITY_SOLUTION_OWNER,
  };

  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();
  const caseService = createCaseServiceMock();
  const attachmentService = createAttachmentServiceMock();

  clientArgs.services.userActionService = userActionService;
  clientArgs.services.caseService = caseService;
  clientArgs.services.attachmentService = attachmentService;
  clientArgs.unifiedAttachmentTypeRegistry.register(commentAttachmentType);
  clientArgs.unifiedAttachmentTypeRegistry.register(stackAlertAttachmentType);

  let generateIdSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    generateIdSpy = jest
      .spyOn(SavedObjectsUtils, 'generateId')
      .mockReturnValue('mock-saved-object-id');
  });

  afterEach(() => {
    generateIdSpy.mockRestore();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      addComment({ comment: { ...unifiedComment, foo: 'bar' }, caseId }, clientArgs)
    ).rejects.toThrow('Excess keys are not allowed');
  });

  it('rejects a legacy v1 body', async () => {
    const v1Comment = { type: 'user', comment: 'a legacy comment', owner: SECURITY_SOLUTION_OWNER };

    await expect(
      // @ts-expect-error: legacy v1 shape is no longer accepted, client is unified-only
      addComment({ comment: v1Comment, caseId }, clientArgs)
    ).rejects.toThrow();
  });

  it(`throws error when the case user actions become > ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [caseId]: MAX_USER_ACTIONS_PER_CASE,
    });

    await expect(addComment({ comment: unifiedComment, caseId }, clientArgs)).rejects.toThrow(
      `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
    );
  });

  it('returns the created attachment without loading the case comments', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const createdAttachment = {
      ...mockCaseUnifiedAttachments[0],
      id: 'mock-saved-object-id',
      score: 0,
    };

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.patchCase.mockResolvedValue(theCase);
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
    );
    attachmentService.create.mockResolvedValue(createdAttachment);

    const res = await addComment({ comment: unifiedComment, caseId }, clientArgs);

    expect(res).toEqual(
      expect.objectContaining({
        id: 'mock-saved-object-id',
        type: createdAttachment.attributes.type,
      })
    );
    expect(caseService.getAllCaseComments).not.toHaveBeenCalled();

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({ owner: SECURITY_SOLUTION_OWNER }),
        ]),
      })
    );
  });

  it('throws a 409 when every alert id is already on the case', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue({
      ...theCase,
      attributes: { ...theCase.attributes, owner: GENERAL_CASES_OWNER },
    });
    attachmentService.getter.getAllAlertIds.mockResolvedValue(new Set(['alert-1']));

    const error = await addComment(
      {
        comment: {
          type: STACK_ALERT_ATTACHMENT_TYPE,
          attachmentId: 'alert-1',
          metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'rule-1' } },
          owner: GENERAL_CASES_OWNER,
        },
        caseId,
      },
      clientArgs
    ).catch((e) => e);

    expect(Boom.isBoom(error)).toBe(true);
    expect(error.output.statusCode).toBe(409);
    expect(error.message).toBe(`Every id in the request is already attached to case ${caseId}.`);
    expect(attachmentService.create).not.toHaveBeenCalled();
    expect(caseService.getAllCaseComments).not.toHaveBeenCalled();
    expect(clientArgs.casesEventBus.emitAttachmentsAdded).not.toHaveBeenCalled();
  });

  it('emits attachmentAdded event after creating a comment', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const createdAttachment = {
      ...mockCaseUnifiedAttachments[0],
      id: 'mock-saved-object-id',
      score: 0,
    };

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.patchCase.mockResolvedValue(theCase);
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
    );
    attachmentService.create.mockResolvedValue(createdAttachment);

    await addComment({ comment: unifiedComment, caseId }, clientArgs);

    expect(clientArgs.casesEventBus.emitAttachmentsAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        caseId,
        ids: expect.any(Array),
        attachmentType: 'comment',
        owner: SECURITY_SOLUTION_OWNER,
      })
    );
  });

  describe('addCommentAndGetCase', () => {
    const theCase = { ...mockCases[0], id: caseId };
    const emptyCommentsPage = { saved_objects: [], total: 0, per_page: 0, page: 1 };

    beforeEach(() => {
      userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });
      caseService.getCase.mockResolvedValue(theCase);
      caseService.patchCase.mockResolvedValue(theCase);
      attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
      );
    });

    it('returns the case after creating the attachment', async () => {
      attachmentService.create.mockResolvedValue({
        ...mockCaseUnifiedAttachments[0],
        id: 'mock-saved-object-id',
      });
      caseService.getAllCaseComments.mockResolvedValue(emptyCommentsPage);

      const res = await addCommentAndGetCase({ comment: unifiedComment, caseId }, clientArgs);

      expect(res.id).toBe(caseId);
      expect(attachmentService.create).toHaveBeenCalledTimes(1);
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledTimes(1);
    });

    it('returns the case when every alert id is already on the case', async () => {
      attachmentService.getter.getAllAlertIds.mockResolvedValue(new Set(['alert-1']));
      attachmentService.getter.getAllEventIds.mockResolvedValue(new Set());
      // The duplicate is past the first page of comments.
      caseService.getAllCaseComments.mockResolvedValue(emptyCommentsPage);
      caseService.getCase.mockResolvedValue({
        ...theCase,
        attributes: { ...theCase.attributes, owner: GENERAL_CASES_OWNER },
      });

      const res = await addCommentAndGetCase(
        {
          comment: {
            type: STACK_ALERT_ATTACHMENT_TYPE,
            attachmentId: 'alert-1',
            metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'rule-1' } },
            owner: GENERAL_CASES_OWNER,
          },
          caseId,
        },
        clientArgs
      );

      expect(res.id).toBe(caseId);
      expect(attachmentService.create).not.toHaveBeenCalled();
    });
  });
});
