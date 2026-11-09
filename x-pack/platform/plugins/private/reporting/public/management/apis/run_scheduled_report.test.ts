/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { runScheduledReport } from './run_scheduled_report';

describe('runScheduledReport', () => {
  const http = httpServiceMock.createStartContract();

  it('should call http.post with the scheduled report id', async () => {
    await runScheduledReport({
      http,
      id: 'report-1',
    });

    expect(http.post).toHaveBeenCalledWith('/internal/reporting/scheduled/report-1/_run');
  });
});
