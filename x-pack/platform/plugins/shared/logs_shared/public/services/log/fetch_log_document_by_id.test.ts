/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { throwError } from 'rxjs';
import { apm } from '@elastic/apm-rum';
import { fetchLogDocumentById, FETCH_LOG_BY_ID_OPERATION_ID } from './fetch_log_document_by_id';

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
  },
}));

const mockSearch = jest.fn();

const mockData = {
  search: {
    search: mockSearch,
  },
} as any;

const mockLogSourcesService = {
  getLogSources: jest.fn(),
} as any;

const signal = new AbortController().signal;

describe('fetchLogDocumentById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('captures APM error with kibana_meta_operation_id label and re-throws when search fails', async () => {
    const error = new Error('search error');
    mockSearch.mockReturnValue(throwError(() => error));

    await expect(
      fetchLogDocumentById(
        {
          id: 'test-id',
          index: 'logs-test',
          data: mockData,
          logSourcesService: mockLogSourcesService,
        },
        signal
      )
    ).rejects.toThrow('search error');

    expect(apm.captureError).toHaveBeenCalledWith(error, {
      labels: { kibana_meta_operation_id: FETCH_LOG_BY_ID_OPERATION_ID },
    });
  });
});
