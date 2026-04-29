/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getAlertDeleteLastRun } from './get_alert_delete_last_run';

const http = httpServiceMock.createStartContract();

describe('getAlertDeleteLastRun', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the correct HTTP request and parses the response', async () => {
    const testDate = '2025-10-01T00:00:00Z';

    http.get.mockResolvedValue({ last_run: testDate });

    const result = await getAlertDeleteLastRun({
      services: { http },
    });

    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining('/internal/alerting/rules/settings/_alert_delete_last_run')
    );

    expect(result).toEqual({ lastRun: testDate });
  });

  it('throws an error if the API call fails', async () => {
    http.get.mockRejectedValue(new Error('API Error'));

    await expect(() =>
      getAlertDeleteLastRun({
        services: { http },
      })
    ).rejects.toThrow('API Error');

    expect(http.get).toHaveBeenCalled();
  });
});
