/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkUpdateAlertWorkflowStatus } from './bulk_update_alert_workflow_status';

const http = httpServiceMock.createStartContract();

describe('bulkUpdateAlertWorkflowStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call bulk update API with correct parameters', async () => {
    await bulkUpdateAlertWorkflowStatus({
      http,
      ids: ['a1', 'a2'],
      status: 'acknowledged',
      index: '.alerts-obs',
    });

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/bulk_update', {
      body: JSON.stringify({
        ids: ['a1', 'a2'],
        status: 'acknowledged',
        index: '.alerts-obs',
      }),
    });
  });
});
