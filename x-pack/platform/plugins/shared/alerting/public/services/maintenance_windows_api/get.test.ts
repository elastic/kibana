/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getMaintenanceWindow } from './get';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('getMaintenanceWindow', () => {
  test('should call get maintenance windows api', async () => {
    const apiResponse = {
      title: 'test',
      duration: 1,
      r_rule: {
        dtstart: '2023-03-23T19:16:21.293Z',
        tzid: 'America/New_York',
        freq: 3,
        interval: 1,
        byweekday: ['TH'],
      },
    };
    http.get.mockResolvedValueOnce(apiResponse);

    const maintenanceWindow = {
      title: 'test',
      duration: 1,
      rRule: {
        dtstart: '2023-03-23T19:16:21.293Z',
        tzid: 'America/New_York',
        freq: 3,
        interval: 1,
        byweekday: ['TH'],
      },
    };

    const result = await getMaintenanceWindow({ http, maintenanceWindowId: '123' });
    expect(result).toEqual(maintenanceWindow);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/maintenance_window/123",
      ]
    `);
  });
});
