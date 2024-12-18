/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { deleteActions } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('deleteActions', () => {
  test('should call delete API per action', async () => {
    const ids = ['1', '2', '/'];

    const result = await deleteActions({ ids, http });
    expect(result).toEqual({ errors: [], successes: [undefined, undefined, undefined] });
    expect(http.delete.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/actions/connector/1",
        ],
        Array [
          "/api/actions/connector/2",
        ],
        Array [
          "/api/actions/connector/%2F",
        ],
      ]
    `);
  });
});
