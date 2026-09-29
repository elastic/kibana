/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { coreMock } from '@kbn/core/public/mocks';
import { createCsvReport } from './create_csv_report';

vi.mock('@kbn/rison', () => {
  const mocked = {
    encode: vi.fn((val) => JSON.stringify(val)),
  };
  return { ...mocked, default: mocked };
});

describe('createCsvReport', () => {
  const mockCoreSetup = coreMock.createSetup();
  const http = mockCoreSetup.http;

  const baseParams = {
    http,
    title: 'Alerts',
    objectType: 'alert',
    browserTimezone: 'UTC',
    version: '9.5.0',
    columns: ['kibana.alert.rule.name', '@timestamp'],
    searchSource: {
      index: { title: '.alerts-default', timeFieldName: '@timestamp' },
      query: { query: '', language: 'kuery' },
      filter: [],
      sort: [{ '@timestamp': { order: 'desc' } }],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    http.post.mockResolvedValue(undefined);
  });

  it('calls the reporting API with the correct URL', async () => {
    await createCsvReport(baseParams);
    expect(http.post).toHaveBeenCalledWith(
      '/internal/reporting/generate/csv_searchsource',
      expect.any(Object)
    );
  });

  it('encodes job params as rison in the request body', async () => {
    await createCsvReport(baseParams);

    const [, options] = http.post.mock.calls[0] as unknown as [string, { body: string }];
    const body = JSON.parse(options.body);
    const jobParams = JSON.parse(body.jobParams);

    expect(jobParams).toEqual({
      title: 'Alerts',
      objectType: 'alert',
      browserTimezone: 'UTC',
      version: '9.5.0',
      columns: ['kibana.alert.rule.name', '@timestamp'],
      searchSource: baseParams.searchSource,
    });
  });

  it('does not include http in the encoded job params', async () => {
    await createCsvReport(baseParams);

    const [, options] = http.post.mock.calls[0] as unknown as [string, { body: string }];
    const body = JSON.parse(options.body);
    const jobParams = JSON.parse(body.jobParams);

    expect(jobParams).not.toHaveProperty('http');
  });
});
