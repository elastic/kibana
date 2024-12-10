/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { updateQueryDelaySettings } from './update_query_delay_settings';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('updateQueryDelaySettings', () => {
  test('should call update query delay settings api', async () => {
    const apiResponse = {
      delay: 10,
    };
    http.post.mockResolvedValueOnce(apiResponse);

    const result = await updateQueryDelaySettings({ http, queryDelaySettings: { delay: 10 } });
    expect(result).toEqual({ delay: 10 });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/settings/_query_delay",
        Object {
          "body": "{\\"delay\\":10}",
        },
      ]
    `);
  });
});
