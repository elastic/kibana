/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentServiceMock } from '../../../services/mocks';
import { PersistableStateAndExternalReferencesLimiter } from './persistable_state_and_external_references';
import {
  createExternalReferenceRequests,
  createFileRequests,
  createPersistableStateRequests,
  createUnifiedAlertRequests,
  createUserRequests,
} from '../test_utils';
import { MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES } from '../../../../common/constants';
import {
  COMMENT_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  INDICATOR_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  OSQUERY_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
} from '../../../../common/constants/attachments';

describe('PersistableStateAndExternalReferencesLimiter', () => {
  const caseId = 'test-id';
  const attachmentService = createAttachmentServiceMock();
  attachmentService.countPersistableStateAndExternalReferenceAttachments.mockResolvedValue(1);

  const limiter = new PersistableStateAndExternalReferencesLimiter(attachmentService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('public fields', () => {
    it('sets the errorMessage to the 100 limit', () => {
      expect(limiter.errorMessage).toMatchInlineSnapshot(
        `"Case has reached the maximum allowed number (100) of attached persistable state and external reference attachments."`
      );
    });

    it('sets the limit to 100', () => {
      expect(limiter.limit).toBe(MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES);
    });
  });

  describe('countOfItemsWithinCase', () => {
    it('calls the attachment service with the right params', async () => {
      await limiter.countOfItemsWithinCase(caseId);

      expect(
        attachmentService.countPersistableStateAndExternalReferenceAttachments
      ).toHaveBeenCalledWith({ caseId });
    });
  });

  describe('countOfItemsInRequest', () => {
    it('returns 0 when passed an empty array', () => {
      expect(limiter.countOfItemsInRequest([])).toBe(0);
    });

    it('returns 0 when the requests are not for persistable state attachments or external references', () => {
      expect(limiter.countOfItemsInRequest(createUserRequests(2))).toBe(0);
    });

    it('counts persistable state attachments or external references correctly', () => {
      expect(
        limiter.countOfItemsInRequest([
          createPersistableStateRequests(1)[0],
          createExternalReferenceRequests(1)[0],
          createUserRequests(1)[0],
          createFileRequests({
            numRequests: 1,
            numFiles: 1,
          })[0],
        ])
      ).toBe(2);
    });

    it('excludes fileAttachmentsRequests from the count', () => {
      expect(
        limiter.countOfItemsInRequest(
          createFileRequests({
            numRequests: 1,
            numFiles: 1,
          })
        )
      ).toBe(0);
    });

    it('counts unified persistable state and external reference attachments', () => {
      expect(
        limiter.countOfItemsInRequest([
          { type: LENS_ATTACHMENT_TYPE, data: { state: {} }, owner: 'test' },
          { type: INDICATOR_ATTACHMENT_TYPE, attachmentId: 'indicator-id', owner: 'test' },
          { type: OSQUERY_ATTACHMENT_TYPE, attachmentId: 'action-id', owner: 'test' },
          { type: SECURITY_ENDPOINT_ATTACHMENT_TYPE, attachmentId: 'action-id', owner: 'test' },
        ])
      ).toBe(4);
    });

    it('excludes unified file, comment and alert attachments from the count', () => {
      expect(
        limiter.countOfItemsInRequest([
          { type: FILE_ATTACHMENT_TYPE, attachmentId: 'file-id', owner: 'test' },
          { type: COMMENT_ATTACHMENT_TYPE, data: { content: 'a comment' }, owner: 'test' },
          ...createUnifiedAlertRequests(1, 'alert-id'),
        ])
      ).toBe(0);
    });
  });
});
