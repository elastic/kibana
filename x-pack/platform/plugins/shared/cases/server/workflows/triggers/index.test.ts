/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import {
  ATTACHMENTS_ADDED_EVENT_TYPE,
  COMMENTS_ADDED_EVENT_TYPE,
} from '@kbn/domain-events/events/cases';
import { attachmentsAddedTriggerDefinition, commentsAddedTriggerDefinition } from './triggers';

const request = httpServerMock.createKibanaRequest();

const baseAttachmentsPayload = {
  caseId: 'case-1',
  owner: 'securitySolution' as const,
  attachmentIds: ['attachment-1', 'attachment-2'],
};

describe('cases workflow server trigger definitions', () => {
  describe('attachmentsAddedTriggerDefinition', () => {
    const { mapEvent } = attachmentsAddedTriggerDefinition;
    const eventType = ATTACHMENTS_ADDED_EVENT_TYPE;

    it('normalizes legacy user attachment type to comment', () => {
      const result = mapEvent!({
        type: eventType,
        payload: {
          ...baseAttachmentsPayload,
          attachmentType: 'user',
        },
        request,
      });

      expect(result).toEqual({
        ...baseAttachmentsPayload,
        attachmentType: 'comment',
      });
    });

    it('passes through non-user attachment types unchanged', () => {
      const result = mapEvent!({
        type: eventType,
        payload: {
          ...baseAttachmentsPayload,
          attachmentType: 'alert',
        },
        request,
      });

      expect(result).toEqual({
        ...baseAttachmentsPayload,
        attachmentType: 'alert',
      });
    });
  });

  describe('commentsAddedTriggerDefinition', () => {
    it('uses cases.commentsAdded as its domain event type', () => {
      expect(commentsAddedTriggerDefinition.domainEventType).toBe(COMMENTS_ADDED_EVENT_TYPE);
    });
  });
});
