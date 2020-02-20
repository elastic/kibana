/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticsearchServiceMock } from '../../../../../../../../src/core/server/mocks';
import { getMonitorStatus } from '../get_monitor_status';
import { APICaller } from '../../../../../../../../src/core/server';

interface BucketItemCriteria {
  monitor_id: string;
  status: string;
  location: string;
  doc_count: number;
}

const genBucketItem = ({ monitor_id, status, location, doc_count }: BucketItemCriteria) => ({
  key: {
    monitor_id,
    status,
    location,
  },
  doc_count,
});

const genExpectedResponse = ({ monitor_id, status, location, doc_count }: BucketItemCriteria) => ({
  monitor_id,
  status,
  location,
  count: doc_count,
});

const deepEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

describe('getMonitorStatus', () => {
  it('fetches single page of results', async () => {
    const esMock = elasticsearchServiceMock.createScopedClusterClient();
    const bucketCriteria: BucketItemCriteria[] = [
      {
        monitor_id: 'foo',
        status: 'down',
        location: 'fairbanks',
        doc_count: 43,
      },
      {
        monitor_id: 'bar',
        status: 'down',
        location: 'harrisburg',
        doc_count: 53,
      },
      {
        monitor_id: 'foo',
        status: 'down',
        location: 'harrisburg',
        doc_count: 44,
      },
    ];
    const mockResponse = {
      aggregations: {
        monitors: {
          buckets: bucketCriteria.map(item => genBucketItem(item)),
        },
      },
    };
    esMock.callAsCurrentUser.mockResolvedValue(mockResponse);
    const callES: APICaller = (method, params) => esMock.callAsCurrentUser(method, params);
    const clientParameters = {
      filters: undefined,
      locations: [],
      numTimes: 5,
      timerange: {
        from: 'now-12m',
        to: 'now-2m',
      },
    };
    const result = await getMonitorStatus({
      callES,
      ...clientParameters,
    });
    expect(esMock.callAsCurrentUser).toHaveBeenCalledTimes(1);
    const [method, params] = esMock.callAsCurrentUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(params.body.query.bool.filter).toHaveLength(2);
    expect(
      params.body.query.bool.filter.some(filter =>
        deepEqual(filter, { term: { 'monitor.status': 'down' } })
      )
    ).toBeTruthy();
    expect(
      params.body.query.bool.filter.some(filter =>
        deepEqual(filter, { range: { '@timestamp': { gte: 'now-12m', lte: 'now-2m' } } })
      )
    ).toBeTruthy();
    expect(params.body.aggs.monitors.composite.size).toBe(2000);
    expect(
      params.body.aggs.monitors.composite.sources.some(source =>
        deepEqual(source, { monitor_id: { terms: { field: 'monitor.id' } } })
      )
    ).toBeTruthy();
    expect(
      params.body.aggs.monitors.composite.sources.some(source =>
        deepEqual(source, { status: { terms: { field: 'monitor.status' } } })
      )
    ).toBeTruthy();
    expect(
      params.body.aggs.monitors.composite.sources.some(source =>
        deepEqual(source, {
          location: { terms: { field: 'observer.geo.name', missing_bucket: true } },
        })
      )
    ).toBeTruthy();

    expect(
      result.some(e =>
        deepEqual(e, { monitor_id: 'foo', status: 'down', location: 'fairbanks', count: 43 })
      )
    ).toBeTruthy();
    expect(
      result.some(e =>
        deepEqual(e, { monitor_id: 'bar', status: 'down', location: 'harrisburg', count: 53 })
      )
    ).toBeTruthy();
    expect(
      result.some(e =>
        deepEqual(e, { monitor_id: 'foo', status: 'down', location: 'harrisburg', count: 44 })
      )
    ).toBeTruthy();
  });
});
