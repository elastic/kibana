/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkDeleteScheduledReports } from './bulk_delete_scheduled_reports';

describe('bulkDeleteScheduledReports', () => {
  const http = httpServiceMock.createStartContract();
  it('should call http.delete with correct parameters', async () => {
    await bulkDeleteScheduledReports({
      http,
      ids: ['report1', 'report2', 'report3'],
    });

    expect(http.delete).toHaveBeenCalledWith('/internal/reporting/scheduled/bulk_delete', {
      body: JSON.stringify({ ids: ['report1', 'report2', 'report3'] }),
    });
  });
});
