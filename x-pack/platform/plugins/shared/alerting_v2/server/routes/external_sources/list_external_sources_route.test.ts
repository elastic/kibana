/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFindExternalSourcesParams } from './list_external_sources_route';

describe('toFindExternalSourcesParams', () => {
  it('maps the snake_case request to camelCase client params', () => {
    expect(
      toFindExternalSourcesParams({
        page: 3,
        per_page: 10,
        search: 'datadog',
        sort_field: 'kind',
        sort_order: 'desc',
        connector_id: 'connector-1',
        type: 'datadog',
      })
    ).toEqual({
      page: 3,
      perPage: 10,
      search: 'datadog',
      sortField: 'kind',
      sortOrder: 'desc',
      connectorId: 'connector-1',
      type: 'datadog',
    });
  });

  it('leaves every param undefined when the request is empty', () => {
    expect(toFindExternalSourcesParams({})).toEqual({
      page: undefined,
      perPage: undefined,
      search: undefined,
      sortField: undefined,
      sortOrder: undefined,
      connectorId: undefined,
      type: undefined,
    });
  });
});
