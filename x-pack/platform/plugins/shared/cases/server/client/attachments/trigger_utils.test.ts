/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACHMENTS_ADDED_EVENT_TYPE,
  COMMENTS_ADDED_EVENT_TYPE,
} from '@kbn/domain-events/events/cases';
import type { Case } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { emitAttachmentsAddedEvent } from './trigger_utils';

describe('emitAttachmentsAddedEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes cases.attachmentsAdded and cases.commentsAdded for comments', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsAddedEvent(
      clientArgs,
      { id: 'case-1', owner: 'securitySolution' } as unknown as Case,
      ['attachment-1', 'attachment-2'],
      'comment'
    );

    expect(clientArgs.domainEvents.publish).toHaveBeenNthCalledWith(1, {
      type: ATTACHMENTS_ADDED_EVENT_TYPE,
      payload: {
        caseId: 'case-1',
        attachmentIds: ['attachment-1', 'attachment-2'],
        attachmentType: 'comment',
        owner: 'securitySolution',
      },
      request: clientArgs.request,
    });
    expect(clientArgs.domainEvents.publish).toHaveBeenNthCalledWith(2, {
      type: COMMENTS_ADDED_EVENT_TYPE,
      payload: {
        caseId: 'case-1',
        owner: 'securitySolution',
        commentIds: ['attachment-1', 'attachment-2'],
      },
      request: clientArgs.request,
    });
  });

  it('only publishes cases.attachmentsAdded for non-comment attachments', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsAddedEvent(
      clientArgs,
      { id: 'case-1', owner: 'securitySolution' } as unknown as Case,
      ['attachment-1'],
      'alert'
    );

    expect(clientArgs.domainEvents.publish).toHaveBeenCalledTimes(1);
    expect(clientArgs.domainEvents.publish).toHaveBeenCalledWith({
      type: ATTACHMENTS_ADDED_EVENT_TYPE,
      payload: {
        caseId: 'case-1',
        attachmentIds: ['attachment-1'],
        attachmentType: 'alert',
        owner: 'securitySolution',
      },
      request: clientArgs.request,
    });
  });
});
