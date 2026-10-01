/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_BULK_GET_ATTACHMENTS } from '../../../common/constants';
import { mockCaseComments, mockCaseUnifiedAttachments } from '../../mocks';
import { createCasesClientMockArgs, createCasesClientMock } from '../mocks';
import { bulkGet } from './bulk_get';

describe('bulkGet', () => {
  // The getter still accepts leftover cases-comments documents (legacy-shaped
  // unknown persistable-state subtype ids). Use a unified fixture for the
  // error-construction tests below, which don't exercise attachment shape.
  const attachmentSO = mockCaseUnifiedAttachments[0];
  const unifiedAttachmentSO = mockCaseUnifiedAttachments[0];
  const legacyAttachmentSO = mockCaseComments[0];

  describe('errors', () => {
    const casesClient = createCasesClientMock();
    const clientArgs = createCasesClientMockArgs();

    clientArgs.authorization.getAndEnsureAuthorizedEntities.mockResolvedValue({
      authorized: [attachmentSO],
      unauthorized: [],
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`throws when trying to fetch more than ${MAX_BULK_GET_ATTACHMENTS} attachments`, async () => {
      await expect(
        bulkGet(
          {
            savedObjectIds: Array(MAX_BULK_GET_ATTACHMENTS + 1).fill('foobar'),
            caseID: '123',
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrow(
        `Error: The length of the field ids is too long. Array must be of length <= ${MAX_BULK_GET_ATTACHMENTS}.`
      );
    });

    it('throws when trying to fetch zero attachments', async () => {
      await expect(
        bulkGet({ savedObjectIds: [], caseID: '123' }, clientArgs, casesClient)
      ).rejects.toThrow(
        'Error: The length of the field ids is too short. Array must be of length >= 1.'
      );
    });

    it('constructs the case error correctly', async () => {
      clientArgs.services.attachmentService.getter.bulkGet.mockResolvedValue({
        saved_objects: [
          attachmentSO,
          {
            id: '1',
            type: 'cases',
            error: {
              error: 'My error',
              message: 'not found',
              statusCode: 404,
            },
            references: [],
          },
        ],
      });

      const res = await bulkGet(
        { savedObjectIds: ['my-case-1'], caseID: 'mock-id-1' },
        clientArgs,
        casesClient
      );

      expect(res.attachments.length).toBe(1);
      expect(res.errors.length).toBe(1);

      expect(res.errors[0]).toEqual({
        savedObjectId: '1',
        error: 'My error',
        message: 'not found',
        status: 404,
      });
    });

    it('constructs the case error correctly in case of an SO decorated error', async () => {
      clientArgs.services.attachmentService.getter.bulkGet.mockResolvedValue({
        saved_objects: [
          attachmentSO,
          {
            id: '1',
            type: 'cases',
            error: {
              ...Boom.boomify(new Error('My error'), {
                statusCode: 404,
                message: 'SO not found',
              }),
            },
            references: [],
          },
        ],
      });

      const res = await bulkGet(
        { savedObjectIds: ['my-case-1'], caseID: 'mock-id-1' },
        clientArgs,
        casesClient
      );

      expect(res.attachments.length).toBe(1);
      expect(res.errors.length).toBe(1);

      expect(res.errors[0]).toEqual({
        savedObjectId: '1',
        error: 'Not Found',
        message: 'SO not found: My error',
        status: 404,
      });
    });
  });

  describe('returns unified attachments', () => {
    const casesClient = createCasesClientMock();
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.authorization.getAndEnsureAuthorizedEntities.mockResolvedValue({
        authorized: [unifiedAttachmentSO],
        unauthorized: [],
      });
      clientArgs.services.attachmentService.getter.bulkGet.mockResolvedValue({
        saved_objects: [unifiedAttachmentSO],
      });
    });

    it('returns unified attachments', async () => {
      const res = await bulkGet(
        { savedObjectIds: ['my-case-1'], caseID: 'mock-id-1' },
        clientArgs,
        casesClient
      );

      expect(clientArgs.services.attachmentService.getter.bulkGet).toHaveBeenCalledWith([
        'my-case-1',
      ]);
      expect(res.attachments[0]).toEqual(
        expect.objectContaining({
          id: unifiedAttachmentSO.id,
          type: 'comment',
          data: { content: 'test' },
        })
      );
    });
  });

  describe('returns a leftover legacy-shaped attachment', () => {
    const casesClient = createCasesClientMock();
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.authorization.getAndEnsureAuthorizedEntities.mockResolvedValue({
        authorized: [legacyAttachmentSO],
        unauthorized: [],
      });
      clientArgs.services.attachmentService.getter.bulkGet.mockResolvedValue({
        saved_objects: [legacyAttachmentSO],
      });
    });

    it('decodes and returns the legacy attachment instead of throwing', async () => {
      const res = await bulkGet(
        { savedObjectIds: [legacyAttachmentSO.id], caseID: 'mock-id-1' },
        clientArgs,
        casesClient
      );

      expect(res.attachments[0]).toEqual(
        expect.objectContaining({
          id: legacyAttachmentSO.id,
          type: 'user',
          comment: 'Wow, good luck catching that bad meanie!',
        })
      );
    });
  });
});
