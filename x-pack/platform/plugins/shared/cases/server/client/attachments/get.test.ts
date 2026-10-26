/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { mockCaseUnifiedAttachments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { find, get } from './get';

const toLegacyShaped = (so: (typeof mockCaseUnifiedAttachments)[number], id = so.id) => {
  return {
    ...so,
    id,
    attributes: {
      ...omit(so.attributes, 'data'),
      type: 'externalReference',
      externalReferenceId: 'ref-1',
      externalReferenceStorage: { type: 'elasticSearchDoc' },
      externalReferenceAttachmentTypeId: 'unknown-third-party-type',
      externalReferenceMetadata: null,
    },
  };
};

describe('get', () => {
  describe('find', () => {
    const clientArgs = createCasesClientMockArgs();
    const emptyFindResponse = { page: 1, per_page: 20, total: 0, saved_objects: [] };

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.services.attachmentService.find.mockResolvedValue(emptyFindResponse as never);
    });

    it('returns an enveloped `data` response', async () => {
      const res = await find({ caseID: 'mock-id', findQueryParams: {} }, clientArgs);

      expect(res).toStrictEqual({ data: [], page: 1, per_page: 20, total: 0 });
    });

    it('does not restrict by type when `type` is omitted', async () => {
      await find({ caseID: 'mock-id', findQueryParams: {} }, clientArgs);

      const call = clientArgs.services.attachmentService.find.mock.calls[0][0];
      expect(call?.options?.filter).toBeUndefined();
    });

    it('builds a type filter when a single `type` is requested', async () => {
      await find({ caseID: 'mock-id', findQueryParams: { type: 'security.alert' } }, clientArgs);

      const call = clientArgs.services.attachmentService.find.mock.calls[0][0];
      expect(call?.options?.filter).toBeDefined();
    });

    it('builds a type filter when multiple `type` values are requested', async () => {
      await find(
        { caseID: 'mock-id', findQueryParams: { type: ['comment', 'security.entity'] } },
        clientArgs
      );

      const call = clientArgs.services.attachmentService.find.mock.calls[0][0];
      expect(call?.options?.filter).toBeDefined();
    });

    it('rejects an empty `type` array', async () => {
      await expect(
        find({ caseID: 'mock-id', findQueryParams: { type: [] } }, clientArgs)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find attachments case id: mock-id: Error: Invalid value \\"[]\\" supplied to \\"type\\",The length of the field type is too short. Array must be of length >= 1."`
      );
    });

    // Type-resolution precision (leftover bucket/subtype mapping) is covered by
    // `type_filter.test.ts`; these tests only check `find` wires the filter through.

    it('skips rows with no unified shape and logs a warning', async () => {
      const [unifiedSO] = mockCaseUnifiedAttachments;
      const legacyShapedSO = toLegacyShaped(unifiedSO, 'legacy-shaped');
      clientArgs.services.attachmentService.find.mockResolvedValue({
        ...emptyFindResponse,
        total: 2,
        saved_objects: [legacyShapedSO, unifiedSO],
      } as never);

      const res = await find({ caseID: 'mock-id-1', findQueryParams: {} }, clientArgs);

      expect(res.data.map(({ id }) => id)).toEqual([unifiedSO.id]);
      expect(clientArgs.logger.warn).toHaveBeenCalledWith(expect.stringContaining('legacy-shaped'));
    });

    it('Invalid total items results in error', async () => {
      await expect(() =>
        find({ caseID: 'mock-id', findQueryParams: { page: 209, perPage: 100 } }, clientArgs)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find attachments case id: mock-id: Error: The number of documents is too high. Paginating through more than 10000 documents is not possible."`
      );
    });

    it('Invalid perPage items results in error', async () => {
      await expect(() =>
        find({ caseID: 'mock-id', findQueryParams: { page: 2, perPage: 9001 } }, clientArgs)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find attachments case id: mock-id: Error: The provided perPage value is too high. The maximum allowed perPage value is 100."`
      );
    });

    it('throws with excess fields', async () => {
      await expect(
        find(
          // @ts-expect-error: excess attribute
          { caseID: 'mock-id', findQueryParams: { page: 2, perPage: 9, foo: 'bar' } },
          clientArgs
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find attachments case id: mock-id: Error: invalid keys \\"foo\\""`
      );
    });
  });

  describe('get', () => {
    const clientArgs = createCasesClientMockArgs();
    const attachmentSO = mockCaseUnifiedAttachments[0];

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.services.attachmentService.getter.get.mockResolvedValue(attachmentSO as never);
    });

    it('returns the attachment when it belongs to the case', async () => {
      const res = await get({ caseID: 'mock-id-1', savedObjectId: attachmentSO.id }, clientArgs);

      expect(res.id).toBe(attachmentSO.id);
      expect(res.type).toBe('comment');
    });

    it('404s when the attachment belongs to a different case', async () => {
      await expect(
        get({ caseID: 'other-case', savedObjectId: attachmentSO.id }, clientArgs)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to get attachment case id: other-case attachment id: mock-attachment-1: Error: This attachment mock-attachment-1 does not exist in case other-case."`
      );
    });

    it('404s when the attachment has no unified shape', async () => {
      clientArgs.services.attachmentService.getter.get.mockResolvedValue(
        toLegacyShaped(attachmentSO) as never
      );

      await expect(
        get({ caseID: 'mock-id-1', savedObjectId: attachmentSO.id }, clientArgs)
      ).rejects.toMatchObject({
        wrappedError: expect.objectContaining({
          message: 'Attachment mock-attachment-1 could not be read.',
          output: expect.objectContaining({ statusCode: 404 }),
        }),
      });
    });
  });
});
