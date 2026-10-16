/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentServiceMock } from '../../../services/mocks';
import { TotalAttachmentsLimiter } from './total_attachments';
import {
  createAlertRequests,
  createEventRequests,
  createExternalReferenceRequests,
  createFileRequests,
  createPersistableStateRequests,
  createUnifiedAlertRequests,
  createUnifiedEventRequests,
  createUnifiedFileRequests,
  createUserRequests,
} from '../test_utils';
import {
  COMMENT_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  MAX_ATTACHMENTS_PER_CASE,
} from '../../../../common/constants';

describe('TotalAttachmentsLimiter', () => {
  const caseId = 'test-id';
  const attachmentService = createAttachmentServiceMock();
  attachmentService.countAttachments.mockResolvedValue(1);

  const limiter = new TotalAttachmentsLimiter(attachmentService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('public fields', () => {
    it('sets the errorMessage to the 5k limit', () => {
      expect(limiter.errorMessage).toMatchInlineSnapshot(
        `"Case has reached the maximum allowed number (5000) of attached items."`
      );
    });

    it('sets the limit to MAX_ATTACHMENTS_PER_CASE', () => {
      expect(limiter.limit).toBe(MAX_ATTACHMENTS_PER_CASE);
    });
  });

  describe('countOfItemsWithinCase', () => {
    it('calls the attachment service with the right params', async () => {
      await limiter.countOfItemsWithinCase(caseId);

      expect(attachmentService.countAttachments).toHaveBeenCalledWith({ caseId });
    });
  });

  describe('countOfItemsInRequest', () => {
    it('returns 0 when there are no requests', () => {
      expect(limiter.countOfItemsInRequest([])).toBe(0);
    });

    it('counts 1 per request for every legacy and unified type', () => {
      expect(
        limiter.countOfItemsInRequest([
          ...createUserRequests(1),
          { type: COMMENT_ATTACHMENT_TYPE, data: { content: 'hi' }, owner: 'test' },
          ...createAlertRequests(1, ['alert-1', 'alert-2']),
          ...createUnifiedAlertRequests(1, ['alert-1', 'alert-2']),
          ...createEventRequests(1, ['event-1', 'event-2']),
          ...createUnifiedEventRequests(1, ['event-1', 'event-2']),
          ...createFileRequests({ numRequests: 1, numFiles: 2 }),
          ...createUnifiedFileRequests({ numRequests: 1, numFiles: 2 }),
          ...createPersistableStateRequests(1),
          ...createExternalReferenceRequests(1),
          { type: LENS_ATTACHMENT_TYPE, data: {}, owner: 'test' },
          { type: 'some.future.type', data: {}, owner: 'test' },
        ])
      ).toBe(12);
    });
  });
});
