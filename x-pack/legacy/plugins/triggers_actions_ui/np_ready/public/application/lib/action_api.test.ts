/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType } from '../../types';
import { httpServiceMock } from '../../../../../../../../src/core/public/mocks';
import { loadActionTypes } from './action_api';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadActionTypes', () => {
  test('should call get action types', async () => {
    const resolvedValue: ActionType[] = [
      {
        id: 'test',
        name: 'Test',
        enabled: true,
      },
    ];
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadActionTypes({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/action/types",
      ]
    `);
  });
});
