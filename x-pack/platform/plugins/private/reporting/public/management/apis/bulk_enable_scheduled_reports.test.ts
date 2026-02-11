/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkEnableScheduledReports } from './bulk_enable_scheduled_reports';

describe('bulkEnableScheduledReports', () => {
  const http = httpServiceMock.createStartContract();
  it('should call http.patch with correct parameters', async () => {
    await bulkEnableScheduledReports({
      http,
      ids: ['report1', 'report2', 'report3'],
    });

    expect(http.patch).toHaveBeenCalledWith('/internal/reporting/scheduled/bulk_enable', {
      body: JSON.stringify({ ids: ['report1', 'report2', 'report3'] }),
    });
  });
});
