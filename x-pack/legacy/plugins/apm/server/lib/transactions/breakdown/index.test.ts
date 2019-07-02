/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTransactionBreakdown } from '.';
import { noDataResponse } from './mock-responses/noData';
import { dataResponse } from './mock-responses/data';

describe('getTransactionBreakdown', () => {
  it('returns an empty array if no data is available', async () => {
    const clientSpy = jest.fn().mockReturnValueOnce(noDataResponse);

    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      setup: {
        start: 0,
        end: 500000,
        client: { search: clientSpy } as any,
        config: {
          get: () => 'myIndex' as any,
          has: () => true
        },
        uiFiltersES: []
      }
    });

    expect(response.length).toBe(0);
  });

  it('returns transaction breakdowns grouped by type and subtype', async () => {
    const clientSpy = jest.fn().mockReturnValueOnce(dataResponse);

    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      setup: {
        start: 0,
        end: 500000,
        client: { search: clientSpy } as any,
        config: {
          get: () => 'myIndex' as any,
          has: () => true
        },
        uiFiltersES: []
      }
    });

    expect(response.length).toBe(3);

    expect(response.map(breakdown => breakdown.name)).toEqual([
      'app',
      'mysql',
      'elasticsearch'
    ]);

    expect(response[0]).toEqual({
      count: 15,
      name: 'app',
      percentage: 2 / 3
    });

    expect(response[1]).toEqual({
      count: 175,
      name: 'mysql',
      percentage: 1 / 3
    });

    expect(response).toMatchSnapshot();
  });
});
