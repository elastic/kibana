/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACHMENTS_ADDED_EVENT_TYPE } from '@kbn/domain-events/events/cases';
import type { Case } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { emitAttachmentsAddedEvent } from './trigger_utils';

describe('emitAttachmentsAddedEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes cases.attachmentsAdded with the attachment ids and type', () => {
    const clientArgs = createCasesClientMockArgs();
    emitAttachmentsAddedEvent(
      clientArgs,
      { id: 'case-1', owner: 'securitySolution' } as unknown as Case,
      ['attachment-1', 'attachment-2'],
      'comment'
    );

    expect(clientArgs.domainEvents.publish).toHaveBeenCalledWith({
      type: ATTACHMENTS_ADDED_EVENT_TYPE,
      payload: {
        caseId: 'case-1',
        attachmentIds: ['attachment-1', 'attachment-2'],
        attachmentType: 'comment',
        owner: 'securitySolution',
      },
      request: clientArgs.request,
    });
  });
});
