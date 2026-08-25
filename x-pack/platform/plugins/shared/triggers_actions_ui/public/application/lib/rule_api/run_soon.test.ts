/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { runSoon } from './run_soon';

const http = httpServiceMock.createStartContract();
beforeEach(() => jest.resetAllMocks());

describe('runSoon', () => {
  test('should call run soon API', async () => {
    const result = await runSoon({ http, id: '1/' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/internal/alerting/rule/1%2F/_run_soon",
        ],
      ]
    `);
  });
});
