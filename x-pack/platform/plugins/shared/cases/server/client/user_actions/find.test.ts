/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_DOCS_PER_PAGE, MAX_USER_ACTIONS_PER_PAGE } from '../../../common/constants';
import { createMockClient } from '../metrics/test_utils/client';
import { createCasesClientMockArgs } from '../mocks';
import { find } from './find';

describe('findUserActions', () => {
  const client = createMockClient();
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('errors', () => {
    it('throws with excess fields', async () => {
      await expect(
        // @ts-expect-error: excess attribute
        find({ caseId: 'test-case', params: { foo: 'bar' } }, client, clientArgs)
      ).rejects.toThrow('invalid keys "foo"');
    });

    it(`throws when trying to fetch more than ${MAX_DOCS_PER_PAGE} items`, async () => {
      await expect(
        find({ caseId: 'test-case', params: { page: 209, perPage: 100 } }, client, clientArgs)
      ).rejects.toThrow(
        `Error: The number of documents is too high. Paginating through more than ${MAX_DOCS_PER_PAGE} documents is not possible.`
      );
    });

    it(`throws when perPage > ${MAX_USER_ACTIONS_PER_PAGE}`, async () => {
      await expect(
        find(
          {
            caseId: 'test-case',
            params: {
              page: 1,
              perPage: MAX_USER_ACTIONS_PER_PAGE + 1,
            },
          },
          client,
          clientArgs
        )
      ).rejects.toThrow(
        `Error: The provided perPage value is too high. The maximum allowed perPage value is ${MAX_USER_ACTIONS_PER_PAGE}.`
      );
    });
  });
});
