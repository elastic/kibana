/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getQueryDelaySettings } from './get_query_delay_settings';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('getQueryDelaySettings', () => {
  test('should call get query delay settings api', async () => {
    const apiResponse = {
      delay: 10,
    };
    http.get.mockResolvedValueOnce(apiResponse);

    const result = await getQueryDelaySettings({ http });
    expect(result).toEqual({ delay: 10 });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/settings/_query_delay",
      ]
    `);
  });
});
