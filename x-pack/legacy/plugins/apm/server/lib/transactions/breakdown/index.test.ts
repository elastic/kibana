/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTransactionBreakdown } from '.';
import * as constants from './constants';
import noDataResponse from './mock-responses/noData.json';
import dataResponse from './mock-responses/data.json';

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

    expect(response.kpis.length).toBe(0);

    expect(Object.keys(response.timeseries_per_subtype).length).toBe(0);
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

    expect(response.kpis.length).toBe(4);

    expect(response.kpis.map(kpi => kpi.name)).toEqual([
      'app',
      'http',
      'postgresql',
      'dispatcher-servlet'
    ]);

    expect(response.kpis[0]).toEqual({
      name: 'app',
      percentage: 0.5408550899466306
    });

    expect(response.kpis[2]).toEqual({
      name: 'postgresql',
      percentage: 0.047366859295002
    });
  });

  it('returns a timeseries grouped by type and subtype', async () => {
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

    const { timeseries_per_subtype: timeseriesPerSubtype } = response;

    expect(Object.keys(timeseriesPerSubtype).length).toBe(4);

    // empty buckets should result in null values for visible types
    expect(timeseriesPerSubtype.app.length).toBe(276);
    expect(timeseriesPerSubtype.app.length).not.toBe(257);

    expect(timeseriesPerSubtype.app[0].x).toBe(1561102380000);

    expect(timeseriesPerSubtype.app[0].y).toBeCloseTo(0.8689440187037277);
  });

  it('should not include more KPIs than MAX_KPIs', async () => {
    // @ts-ignore
    constants.MAX_KPIS = 2;

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

    const { timeseries_per_subtype: timeseriesPerSubtype } = response;

    expect(Object.keys(timeseriesPerSubtype)).toEqual(['app', 'http']);
  });
});
