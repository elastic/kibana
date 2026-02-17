/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createAlertDeleteSchedule } from './create_alert_delete_schedule';

const http = httpServiceMock.createStartContract();

describe('alertDeletePreviewApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the correct HTTP request and parses the response is empty', async () => {
    http.post.mockResolvedValue(undefined);

    const res = await createAlertDeleteSchedule({
      services: { http },
      requestBody: {
        activeAlertDeleteThreshold: 10,
        inactiveAlertDeleteThreshold: 1,
        categoryIds: ['management'],
      },
    });

    expect(res).toBeUndefined();

    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('/internal/alerting/rules/settings/_alert_delete_schedule'),
      expect.objectContaining({
        body: JSON.stringify({
          active_alert_delete_threshold: 10,
          inactive_alert_delete_threshold: 1,
          category_ids: ['management'],
        }),
      })
    );
  });

  it('sends the correct HTTP request and parses the response if response is string', async () => {
    http.post.mockResolvedValue(`task is already running`);

    const res = await createAlertDeleteSchedule({
      services: { http },
      requestBody: {
        activeAlertDeleteThreshold: 10,
        inactiveAlertDeleteThreshold: 1,
        categoryIds: ['management'],
      },
    });

    expect(res).toBe(`task is already running`);

    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('/internal/alerting/rules/settings/_alert_delete_schedule'),
      expect.objectContaining({
        body: JSON.stringify({
          active_alert_delete_threshold: 10,
          inactive_alert_delete_threshold: 1,
          category_ids: ['management'],
        }),
      })
    );
  });

  it('throws an error if the API call fails', async () => {
    http.post.mockRejectedValue(new Error('API Error'));

    await expect(() =>
      createAlertDeleteSchedule({
        services: { http },
        requestBody: {
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 1,
          categoryIds: ['management'],
        },
      })
    ).rejects.toThrow('API Error');

    expect(http.post).toHaveBeenCalled();
  });
});
