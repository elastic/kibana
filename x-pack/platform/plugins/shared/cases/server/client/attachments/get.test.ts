/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../mocks';
import { find as findComment } from './get';

describe('get', () => {
  describe('findComment', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Invalid total items results in error', async () => {
      await expect(() =>
        findComment({ caseID: 'mock-id', findQueryParams: { page: 209, perPage: 100 } }, clientArgs)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find comments case id: mock-id: Error: The number of documents is too high. Paginating through more than 10000 documents is not possible."`
      );
    });

    it('Invalid perPage items results in error', async () => {
      await expect(() =>
        findComment({ caseID: 'mock-id', findQueryParams: { page: 2, perPage: 9001 } }, clientArgs)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find comments case id: mock-id: Error: The provided perPage value is too high. The maximum allowed perPage value is 100."`
      );
    });

    it('throws with excess fields', async () => {
      await expect(
        findComment(
          // @ts-expect-error: excess attribute
          { caseID: 'mock-id', findQueryParams: { page: 2, perPage: 9, foo: 'bar' } },
          clientArgs
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find comments case id: mock-id: Error: invalid keys \\"foo\\""`
      );
    });
  });
});
