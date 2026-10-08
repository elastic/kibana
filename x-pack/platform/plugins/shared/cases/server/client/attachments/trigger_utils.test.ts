/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentAttributesV2, Case } from '../../../common/types/domain';
import { AttachmentType, CaseAccessMode } from '../../../common/types/domain';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { mockCaseComments, mockCaseUnifiedAttachments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { emitAttachmentsAddedEvent, emitAttachmentsDeletedEvents } from './trigger_utils';

describe('emitAttachmentsAddedEvent', () => {
  it('emits attachmentsAdded with the attachment ids and type', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsAddedEvent(
      clientArgs,
      { id: 'case-1', owner: 'securitySolution' } as unknown as Case,
      ['attachment-1', 'attachment-2'],
      'comment'
    );

    expect(clientArgs.casesEventBus.emitAttachmentsAdded).toHaveBeenCalledWith(clientArgs.request, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1', 'attachment-2'],
      attachmentType: 'comment',
      owner: 'securitySolution',
    });
  });

  it('does not emit for a restricted case', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsAddedEvent(
      clientArgs,
      {
        id: 'case-1',
        owner: 'securitySolution',
        access: { mode: CaseAccessMode.RESTRICTED },
      } as unknown as Case,
      ['attachment-1'],
      'comment'
    );

    expect(clientArgs.casesEventBus.emitAttachmentsAdded).not.toHaveBeenCalled();
  });
});

describe('emitAttachmentsDeletedEvents', () => {
  const [userComment, , , alertComment, secondAlertComment] = mockCaseComments;

  it('does not emit when there are no attachments', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsDeletedEvents(clientArgs, { id: 'case-1' }, []);

    expect(clientArgs.casesEventBus.emitAttachmentsDeleted).not.toHaveBeenCalled();
  });

  it('does not emit for a restricted case', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsDeletedEvents(clientArgs, { id: 'case-1', access: { mode: CaseAccessMode.RESTRICTED } }, [
      userComment,
    ]);

    expect(clientArgs.casesEventBus.emitAttachmentsDeleted).not.toHaveBeenCalled();
  });

  it('emits one event per attachment type', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsDeletedEvents(clientArgs, { id: 'case-1' }, [
      userComment,
      alertComment,
      secondAlertComment,
    ]);

    const { emitAttachmentsDeleted } = clientArgs.casesEventBus;
    expect(emitAttachmentsDeleted).toHaveBeenCalledTimes(2);
    expect(emitAttachmentsDeleted).toHaveBeenNthCalledWith(1, clientArgs.request, {
      caseId: 'case-1',
      attachmentIds: ['mock-comment-1'],
      attachmentType: 'user',
      owner: 'securitySolution',
    });
    expect(emitAttachmentsDeleted).toHaveBeenNthCalledWith(2, clientArgs.request, {
      caseId: 'case-1',
      attachmentIds: ['mock-comment-4', 'mock-comment-5'],
      attachmentType: 'alert',
      owner: 'securitySolution',
      alertIds: ['test-id', 'test-id-2'],
      alertIndices: ['test-index', 'test-index-2'],
    });
  });

  it('flattens multi-alert attachments into index-aligned alert ids and indices', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsDeletedEvents(clientArgs, { id: 'case-1' }, [
      {
        ...alertComment,
        attributes: {
          ...alertComment.attributes,
          alertId: ['alert-1', 'alert-2'],
          index: ['index-1', 'index-2'],
        } as AttachmentAttributesV2,
      },
    ]);

    expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        alertIds: ['alert-1', 'alert-2'],
        alertIndices: ['index-1', 'index-2'],
      })
    );
  });

  it('includes alert references for unified alert attachments', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsDeletedEvents(clientArgs, { id: 'case-1' }, [
      {
        id: 'unified-alert-1',
        attributes: {
          ...mockCaseUnifiedAttachments[0].attributes,
          type: SECURITY_ALERT_ATTACHMENT_TYPE,
          attachmentId: 'alert-1',
          metadata: { index: 'index-1' },
        } as AttachmentAttributesV2,
      },
    ]);

    expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
      clientArgs.request,
      {
        caseId: 'case-1',
        attachmentIds: ['unified-alert-1'],
        attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE,
        owner: 'securitySolution',
        alertIds: ['alert-1'],
        alertIndices: ['index-1'],
      }
    );
  });

  it('includes event references for event attachments', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsDeletedEvents(clientArgs, { id: 'case-1' }, [
      {
        id: 'event-attachment-1',
        attributes: {
          ...userComment.attributes,
          type: AttachmentType.event,
          eventId: 'event-1',
          index: 'event-index-1',
        } as AttachmentAttributesV2,
      },
    ]);

    expect(clientArgs.casesEventBus.emitAttachmentsDeleted).toHaveBeenCalledWith(
      clientArgs.request,
      {
        caseId: 'case-1',
        attachmentIds: ['event-attachment-1'],
        attachmentType: 'event',
        owner: 'securitySolution',
        eventIds: ['event-1'],
        eventIndices: ['event-index-1'],
      }
    );
  });
});
