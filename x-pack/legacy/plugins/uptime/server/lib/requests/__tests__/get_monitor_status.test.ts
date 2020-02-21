/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticsearchServiceMock } from '../../../../../../../../src/core/server/mocks';
import { getMonitorStatus } from '../get_monitor_status';

interface BucketItemCriteria {
  monitor_id: string;
  status: string;
  location: string;
  doc_count: number;
}

interface BucketKey {
  monitor_id: string;
  status: string;
  location: string;
}

interface BucketItem {
  key: BucketKey;
  doc_count: number;
}

interface MultiPageCriteria {
  after_key?: BucketKey;
  bucketCriteria: BucketItemCriteria[];
}

const genBucketItem = ({
  monitor_id,
  status,
  location,
  doc_count,
}: BucketItemCriteria): BucketItem => ({
  key: {
    monitor_id,
    status,
    location,
  },
  doc_count,
});

const deepEqual = (a: any, b: any) => {
  return JSON.stringify(a) === JSON.stringify(b);
};

const setupMock = (criteria: MultiPageCriteria[]) => {
  const esMock = elasticsearchServiceMock.createScopedClusterClient();

  criteria.forEach(({ after_key, bucketCriteria }) => {
    const mockResponse = {
      aggregations: {
        monitors: {
          after_key,
          buckets: bucketCriteria.map(item => genBucketItem(item)),
        },
      },
    };
    esMock.callAsCurrentUser.mockResolvedValueOnce(mockResponse);
  });
  return [(method: any, params: any) => esMock.callAsCurrentUser(method, params), esMock];
};

describe('getMonitorStatus', () => {
  it('applies bool filters to params', async () => {
    const [callES, esMock] = setupMock([]);
    const exampleFilter = `{
      "bool": {
        "should": [
          {
            "bool": {
              "should": [
                {
                  "match_phrase": {
                    "monitor.id": "apm-dev"
                  }
                }
              ],
              "minimum_should_match": 1
            }
          },
          {
            "bool": {
              "should": [
                {
                  "match_phrase": {
                    "monitor.id": "auto-http-0X8D6082B94BBE3B8A"
                  }
                }
              ],
              "minimum_should_match": 1
            }
          }
        ],
        "minimum_should_match": 1
      }
    }`;
    await getMonitorStatus({
      callES,
      filters: exampleFilter,
      locations: [],
      numTimes: 5,
      timerange: {
        from: 'now-10m',
        to: 'now-1m',
      },
    });
    expect(esMock.callAsCurrentUser).toHaveBeenCalledTimes(1);
    const [method, params] = esMock.callAsCurrentUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(params?.body?.query?.bool?.should).toBeTruthy();
    const rootShould = params?.body?.query?.bool?.should;
    expect(rootShould).toHaveLength(2);
    const ids = rootShould.map((clause: any) => clause.bool.should[0].match_phrase['monitor.id']);
    expect(ids.some((id: string) => id === 'apm-dev'));
    expect(ids.some((id: string) => id === 'auto-http-0X8D6082B94BBE3B8A'));
  });

  it('applies locations to params', async () => {
    const [callES, esMock] = setupMock([]);
    await getMonitorStatus({
      callES,
      locations: ['fairbanks', 'harrisburg'],
      numTimes: 1,
      timerange: {
        from: 'now-2m',
        to: 'now',
      },
    });
    expect(esMock.callAsCurrentUser).toHaveBeenCalledTimes(1);
    const [method, params] = esMock.callAsCurrentUser.mock.calls[0];
    expect(method).toEqual('search');
    const filter = params?.body?.query?.bool?.filter;
    expect(filter).toBeTruthy();
    expect(Array.isArray(filter)).toBeTruthy();
    const locationClause = filter.find((clause: any) => !!clause.bool);
    expect(locationClause.bool.should).toHaveLength(2);
    const locations = locationClause.bool.should.map(
      (location: any) => location?.term?.['observer.geo.name']
    );
    expect(locations.some((location: string) => location === 'fairbanks'));
    expect(locations.some((location: string) => location === 'harrisburg'));
  });

  it('fetches single page of results', async () => {
    const [callES, esMock] = setupMock([
      {
        bucketCriteria: [
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
        ],
      },
    ]);
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
      params.body.query.bool.filter.some((filter: any) =>
        deepEqual(filter, { term: { 'monitor.status': 'down' } })
      )
    ).toBeTruthy();
    expect(
      params.body.query.bool.filter.some((filter: any) =>
        deepEqual(filter, { range: { '@timestamp': { gte: 'now-12m', lte: 'now-2m' } } })
      )
    ).toBeTruthy();
    expect(params.body.aggs.monitors.composite.size).toBe(2000);
    expect(
      params.body.aggs.monitors.composite.sources.some((source: any) =>
        deepEqual(source, { monitor_id: { terms: { field: 'monitor.id' } } })
      )
    ).toBeTruthy();
    expect(
      params.body.aggs.monitors.composite.sources.some((source: any) =>
        deepEqual(source, { status: { terms: { field: 'monitor.status' } } })
      )
    ).toBeTruthy();
    expect(
      params.body.aggs.monitors.composite.sources.some((source: any) =>
        deepEqual(source, {
          location: { terms: { field: 'observer.geo.name', missing_bucket: true } },
        })
      )
    ).toBeTruthy();

    expect(
      result.some((e: any) =>
        deepEqual(e, { monitor_id: 'foo', status: 'down', location: 'fairbanks', count: 43 })
      )
    ).toBeTruthy();
    expect(
      result.some((e: any) =>
        deepEqual(e, { monitor_id: 'bar', status: 'down', location: 'harrisburg', count: 53 })
      )
    ).toBeTruthy();
    expect(
      result.some((e: any) =>
        deepEqual(e, { monitor_id: 'foo', status: 'down', location: 'harrisburg', count: 44 })
      )
    ).toBeTruthy();
  });

  it('fetches multiple pages of results in the thing', async () => {
    const criteria = [
      {
        after_key: {
          monitor_id: 'foo',
          location: 'harrisburg',
          status: 'down',
        },
        bucketCriteria: [
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
        ],
      },
      {
        after_key: {
          monitor_id: 'bar',
          status: 'down',
          location: 'fairbanks',
        },
        bucketCriteria: [
          {
            monitor_id: 'sna',
            status: 'down',
            location: 'fairbanks',
            doc_count: 21,
          },
          {
            monitor_id: 'fu',
            status: 'down',
            location: 'fairbanks',
            doc_count: 21,
          },
          {
            monitor_id: 'bar',
            status: 'down',
            location: 'fairbanks',
            doc_count: 45,
          },
        ],
      },
      {
        bucketCriteria: [
          {
            monitor_id: 'sna',
            status: 'down',
            location: 'harrisburg',
            doc_count: 21,
          },
          {
            monitor_id: 'fu',
            status: 'down',
            location: 'harrisburg',
            doc_count: 21,
          },
        ],
      },
    ];
    const [callES] = setupMock(criteria);
    const result = await getMonitorStatus({
      callES,
      locations: [],
      numTimes: 5,
      timerange: {
        from: 'now-10m',
        to: 'now-1m',
      },
    });
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(8);
    const expectedValues = criteria
      .map(({ bucketCriteria }) => [
        ...bucketCriteria.map(({ monitor_id, status, location, doc_count }) => ({
          monitor_id,
          status,
          location,
          count: doc_count,
        })),
      ])
      .reduce((acc, cur) => acc.concat(cur), []);
    expectedValues.forEach(val => {
      expect(result.find((r: any) => deepEqual(r, val))).toBeTruthy();
    });
  });
});
