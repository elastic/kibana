/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../mocks';
import { find } from './get';

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

    // Type-resolution precision (legacy bucket/subtype mapping) is covered by
    // `type_filter.test.ts`; these tests only check `find` wires the filter through.

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
});
