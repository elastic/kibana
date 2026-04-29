/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchServerSearchableTypes } from './fetch_server_searchable_types';

describe('fetchServerSearchableTypes', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  it('perform a GET request to the endpoint with valid options', () => {
    http.get.mockResolvedValue({ results: [] });

    fetchServerSearchableTypes(http);

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/internal/global_search/searchable_types');
  });

  it('returns the results from the server', async () => {
    const types = ['typeA', 'typeB'];

    http.get.mockResolvedValue({ types });

    const results = await fetchServerSearchableTypes(http);

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(results).toEqual(types);
  });
});
