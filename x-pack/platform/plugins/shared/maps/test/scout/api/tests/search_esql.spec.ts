/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEARCH_API_BASE_URL } from '@kbn/data-plugin/server/search/routes';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - search ES|QL', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logstashFunctional);
  });

  apiTest('should return getColumns response in expected shape', async ({ apiClient }) => {
    const response = await apiClient.post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`, {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        params: {
          query: 'from logstash-* | keep geo.coordinates | limit 0',
        },
      },
    });

    expect(response).toHaveStatusCode(200);
    const { took, ...rawResponse } = response.body.rawResponse;
    expect(rawResponse.columns).toStrictEqual([{ name: 'geo.coordinates', type: 'geo_point' }]);
    expect(rawResponse.values).toStrictEqual([]);
    expect(rawResponse.values_loaded).toBe(0);
    expect(rawResponse.is_partial).toBe(false);
    expect(rawResponse.documents_found).toBe(0);
  });

  apiTest('should return getValues response in expected shape', async ({ apiClient }) => {
    const response = await apiClient.post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`, {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        params: {
          dropNullColumns: true,
          query: 'from logstash-* | keep geo.coordinates, @timestamp | sort @timestamp | limit 1',
        },
      },
    });

    expect(response).toHaveStatusCode(200);
    const { took, ...rawResponse } = response.body.rawResponse;
    expect(rawResponse.all_columns).toStrictEqual([
      { name: 'geo.coordinates', type: 'geo_point' },
      { name: '@timestamp', type: 'date' },
    ]);
    expect(rawResponse.columns).toStrictEqual([
      { name: 'geo.coordinates', type: 'geo_point' },
      { name: '@timestamp', type: 'date' },
    ]);
    expect(rawResponse.documents_found).toBe(3);
    expect(rawResponse.is_partial).toBe(false);
    expect(rawResponse.values).toStrictEqual([
      ['POINT (-120.9871642 38.68407028)', '2015-09-20T00:00:00.000Z'],
    ]);
    expect(rawResponse.values_loaded).toBe(4);
  });
});
