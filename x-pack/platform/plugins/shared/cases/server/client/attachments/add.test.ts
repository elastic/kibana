/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';
import { MAX_USER_ACTIONS_PER_CASE, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { AttachmentType } from '../../../common/types/domain';
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
import { addComment } from './add';

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
    ).rejects.toThrow('invalid keys "foo"');
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

  it('returns the created attachment, not the case', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const createdAttachment = {
      ...mockCaseUnifiedAttachments[0],
      id: 'mock-saved-object-id',
      score: 0,
    };

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.patchCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [createdAttachment],
      total: 1,
      per_page: 1,
      page: 1,
    });
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
    );
    attachmentService.create.mockResolvedValue(createdAttachment);

    const res = await addComment({ comment: unifiedComment, caseId }, clientArgs);

    expect(res).toStrictEqual(
      expect.objectContaining({
        id: 'mock-saved-object-id',
        type: createdAttachment.attributes.type,
        data: createdAttachment.attributes.data,
      })
    );
    expect(res).not.toHaveProperty('comments');

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({ owner: SECURITY_SOLUTION_OWNER }),
        ]),
      })
    );
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
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [createdAttachment],
      total: 1,
      per_page: 1,
      page: 1,
    });
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseId, { alerts: 0, userComments: 0, events: 0 }]])
    );
    attachmentService.create.mockResolvedValue(createdAttachment);

    await addComment({ comment: unifiedComment, caseId }, clientArgs);

    expect(clientArgs.casesEventBus.emitAttachmentsAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        caseId,
        attachmentIds: expect.any(Array),
        attachmentType: 'comment',
        owner: SECURITY_SOLUTION_OWNER,
      })
    );
  });

  it('returns the existing alert attachment when every id is already on the case', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const existingAlertId = 'existing-alert-so';
    const alertId = 'alert-1';
    const existingAlert = {
      type: 'cases-attachments',
      id: existingAlertId,
      version: 'WzAsMV0=',
      score: 0,
      attributes: {
        type: STACK_ALERT_ATTACHMENT_TYPE,
        attachmentId: alertId,
        metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'rule-1' } },
        owner: SECURITY_SOLUTION_OWNER,
        created_at: '2019-11-25T21:55:00.177Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      },
      references: [{ type: 'cases', name: 'associated-cases', id: caseId }],
    };

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [existingAlert],
      total: 1,
      per_page: 1,
      page: 1,
    });
    attachmentService.getter.getAllAlertIds.mockResolvedValue(new Set([alertId]));
    attachmentService.getter.getAllEventIds.mockResolvedValue(new Set());

    const res = await addComment(
      {
        comment: {
          type: STACK_ALERT_ATTACHMENT_TYPE,
          attachmentId: alertId,
          metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'rule-1' } },
          owner: SECURITY_SOLUTION_OWNER,
        },
        caseId,
      },
      clientArgs
    );

    expect(res).toStrictEqual(
      expect.objectContaining({
        id: existingAlertId,
        type: STACK_ALERT_ATTACHMENT_TYPE,
        attachmentId: alertId,
      })
    );
    expect(attachmentService.create).not.toHaveBeenCalled();
    expect(clientArgs.casesEventBus.emitAttachmentsAdded).not.toHaveBeenCalled();
  });

  it('folds a legacy v1 alert into the unified response on duplicate id', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const existingAlertId = 'legacy-alert-so';
    const alertId = 'alert-1';
    const legacyAlert = {
      type: 'cases-comment',
      id: existingAlertId,
      version: 'WzAsMV0=',
      score: 0,
      attributes: {
        type: AttachmentType.alert as const,
        alertId,
        index: 'index-1',
        rule: { id: 'rule-1', name: 'rule-1' },
        owner: SECURITY_SOLUTION_OWNER,
        created_at: '2019-11-25T21:55:00.177Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      },
      references: [{ type: 'cases', name: 'associated-cases', id: caseId }],
    };

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [legacyAlert],
      total: 1,
      per_page: 1,
      page: 1,
    });
    attachmentService.getter.getAllAlertIds.mockResolvedValue(new Set([alertId]));
    attachmentService.getter.getAllEventIds.mockResolvedValue(new Set());

    const res = await addComment(
      {
        comment: {
          type: STACK_ALERT_ATTACHMENT_TYPE,
          attachmentId: alertId,
          metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'rule-1' } },
          owner: SECURITY_SOLUTION_OWNER,
        },
        caseId,
      },
      clientArgs
    );

    expect(res).toStrictEqual(
      expect.objectContaining({
        id: existingAlertId,
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: alertId,
      })
    );
    expect(res).not.toHaveProperty('alertId');
    expect(attachmentService.create).not.toHaveBeenCalled();
  });

  it('returns the alert, not an event that shares the same id', async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({ [caseId]: 0 });

    const sharedId = 'shared-id';
    const persistedFields = {
      owner: SECURITY_SOLUTION_OWNER,
      created_at: '2019-11-25T21:55:00.177Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
    const existingEvent = {
      type: 'cases-attachments',
      id: 'existing-event-so',
      version: 'WzAsMV0=',
      score: 0,
      attributes: {
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        attachmentId: sharedId,
        metadata: { index: 'index-1' },
        ...persistedFields,
      },
      references: [{ type: 'cases', name: 'associated-cases', id: caseId }],
    };
    const existingAlert = {
      type: 'cases-attachments',
      id: 'existing-alert-so',
      version: 'WzAsMV0=',
      score: 0,
      attributes: {
        type: STACK_ALERT_ATTACHMENT_TYPE,
        attachmentId: sharedId,
        metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'rule-1' } },
        ...persistedFields,
      },
      references: [{ type: 'cases', name: 'associated-cases', id: caseId }],
    };

    const theCase = { ...mockCases[0], id: caseId };
    caseService.getCase.mockResolvedValue(theCase);
    caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [existingEvent, existingAlert],
      total: 2,
      per_page: 2,
      page: 1,
    });
    attachmentService.getter.getAllAlertIds.mockResolvedValue(new Set([sharedId]));
    attachmentService.getter.getAllEventIds.mockResolvedValue(new Set([sharedId]));

    const res = await addComment(
      {
        comment: {
          type: STACK_ALERT_ATTACHMENT_TYPE,
          attachmentId: sharedId,
          metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'rule-1' } },
          owner: SECURITY_SOLUTION_OWNER,
        },
        caseId,
      },
      clientArgs
    );

    expect(res).toStrictEqual(
      expect.objectContaining({
        id: 'existing-alert-so',
        type: STACK_ALERT_ATTACHMENT_TYPE,
        attachmentId: sharedId,
      })
    );
    expect(attachmentService.create).not.toHaveBeenCalled();
  });
});
