/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkUntrackAlerts } from './bulk_untrack_alerts';

const http = httpServiceMock.createStartContract();

describe('bulkUntrackAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call bulk untrack API with correct parameters', async () => {
    await bulkUntrackAlerts({
      http,
      indices: ['.alerts-obs', '.alerts-stack'],
      alertUuids: ['uuid-1', 'uuid-2'],
    });

    expect(http.post).toHaveBeenCalledWith('/internal/alerting/alerts/_bulk_untrack', {
      body: JSON.stringify({
        indices: ['.alerts-obs', '.alerts-stack'],
        alert_uuids: ['uuid-1', 'uuid-2'],
      }),
    });
  });
});
