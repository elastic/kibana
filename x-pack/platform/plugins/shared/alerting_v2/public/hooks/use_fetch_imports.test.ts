/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH } from '@kbn/alerting-v2-constants';
import { fetchImports, toFindExternalSourcesRequest } from './use_fetch_imports';

describe('toFindExternalSourcesRequest', () => {
  it('maps the camelCase params to the snake_case list request', () => {
    expect(
      toFindExternalSourcesRequest({
        page: 2,
        perPage: 25,
        search: 'prod',
        sortField: 'type',
        sortOrder: 'desc',
      })
    ).toEqual({
      page: 2,
      per_page: 25,
      search: 'prod',
      sort_field: 'type',
      sort_order: 'desc',
      connector_id: undefined,
      type: undefined,
    });
  });
});

describe('fetchImports', () => {
  it('requests one page from the external source list API and maps each import to a row', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue({
      items: [
        {
          id: 'import-1',
          type: 'datadog',
          kind: 'alert',
          metadata: { name: 'Datadog production' },
          connector_id: 'connector-1',
          version: 1,
          created_by: null,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_by: null,
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ],
      total: 30,
      page: 2,
      per_page: 25,
    });

    const result = await fetchImports(http, {
      page: 2,
      perPage: 25,
      search: 'prod',
      sortField: 'name',
      sortOrder: 'asc',
    });

    expect(http.get).toHaveBeenCalledWith(ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH, {
      query: expect.objectContaining({
        page: 2,
        per_page: 25,
        search: 'prod',
        sort_field: 'name',
        sort_order: 'asc',
      }),
    });
    expect(result).toEqual({
      items: [
        { id: 'import-1', name: 'Datadog production', type: 'datadog', connectorId: 'connector-1' },
      ],
      total: 30,
    });
  });
});
