/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSortedEventsQuery, type BuildSortedEventsQuery } from './build_sorted_events_query';
import type { Writable } from '@kbn/utility-types';

const DefaultQuery: Writable<Partial<BuildSortedEventsQuery>> = {
  index: ['index-name'],
  from: '2021-01-01T00:00:10.123Z',
  to: '2021-01-23T12:00:50.321Z',
  filter: {},
  size: 100,
  timeField: 'timefield',
};

describe('buildSortedEventsQuery', () => {
  let query: Partial<BuildSortedEventsQuery>;
  beforeEach(() => {
    query = { ...DefaultQuery };
  });

  test('it builds a filter with given date range', () => {
    expect(buildSortedEventsQuery(query as BuildSortedEventsQuery)).toEqual({
      allow_no_indices: true,
      index: ['index-name'],
      size: 100,
      ignore_unavailable: true,
      track_total_hits: false,
      body: {
        docvalue_fields: [
          {
            field: 'timefield',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {},
              {
                bool: {
                  filter: [
                    {
                      range: {
                        timefield: {
                          gte: '2021-01-01T00:00:10.123Z',
                          lte: '2021-01-23T12:00:50.321Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            timefield: {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'asc',
            },
          },
        ],
      },
    });
  });

  test('it does not include searchAfterSortId if it is an empty string', () => {
    query.searchAfterSortId = '';
    expect(buildSortedEventsQuery(query as BuildSortedEventsQuery)).toEqual({
      allow_no_indices: true,
      index: ['index-name'],
      size: 100,
      ignore_unavailable: true,
      track_total_hits: false,
      body: {
        docvalue_fields: [
          {
            field: 'timefield',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {},
              {
                bool: {
                  filter: [
                    {
                      range: {
                        timefield: {
                          gte: '2021-01-01T00:00:10.123Z',
                          lte: '2021-01-23T12:00:50.321Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            timefield: {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'asc',
            },
          },
        ],
      },
    });
  });

  test('it includes searchAfterSortId if it is a valid string', () => {
    const sortId = '123456789012';
    query.searchAfterSortId = sortId;
    expect(buildSortedEventsQuery(query as BuildSortedEventsQuery)).toEqual({
      allow_no_indices: true,
      index: ['index-name'],
      size: 100,
      ignore_unavailable: true,
      track_total_hits: false,
      body: {
        docvalue_fields: [
          {
            field: 'timefield',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {},
              {
                bool: {
                  filter: [
                    {
                      range: {
                        timefield: {
                          gte: '2021-01-01T00:00:10.123Z',
                          lte: '2021-01-23T12:00:50.321Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            timefield: {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'asc',
            },
          },
        ],
        search_after: [sortId],
      },
    });
  });

  test('it includes searchAfterSortId if it is a valid number', () => {
    const sortId = 123456789012;
    query.searchAfterSortId = sortId;
    expect(buildSortedEventsQuery(query as BuildSortedEventsQuery)).toEqual({
      allow_no_indices: true,
      index: ['index-name'],
      size: 100,
      ignore_unavailable: true,
      track_total_hits: false,
      body: {
        docvalue_fields: [
          {
            field: 'timefield',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {},
              {
                bool: {
                  filter: [
                    {
                      range: {
                        timefield: {
                          gte: '2021-01-01T00:00:10.123Z',
                          lte: '2021-01-23T12:00:50.321Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            timefield: {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'asc',
            },
          },
        ],
        search_after: [sortId],
      },
    });
  });

  test('it includes aggregations if provided', () => {
    query.aggs = {
      tags: {
        terms: {
          field: 'tag',
        },
      },
    };
    expect(buildSortedEventsQuery(query as BuildSortedEventsQuery)).toEqual({
      allow_no_indices: true,
      index: ['index-name'],
      size: 100,
      ignore_unavailable: true,
      track_total_hits: false,
      body: {
        docvalue_fields: [
          {
            field: 'timefield',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {},
              {
                bool: {
                  filter: [
                    {
                      range: {
                        timefield: {
                          gte: '2021-01-01T00:00:10.123Z',
                          lte: '2021-01-23T12:00:50.321Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          tags: {
            terms: {
              field: 'tag',
            },
          },
        },
        sort: [
          {
            timefield: {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'asc',
            },
          },
        ],
      },
    });
  });

  test('it uses sortOrder if specified', () => {
    query.sortOrder = 'desc';
    expect(buildSortedEventsQuery(query as BuildSortedEventsQuery)).toEqual({
      allow_no_indices: true,
      index: ['index-name'],
      size: 100,
      ignore_unavailable: true,
      track_total_hits: false,
      body: {
        docvalue_fields: [
          {
            field: 'timefield',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {},
              {
                bool: {
                  filter: [
                    {
                      range: {
                        timefield: {
                          gte: '2021-01-01T00:00:10.123Z',
                          lte: '2021-01-23T12:00:50.321Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            timefield: {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'desc',
            },
          },
        ],
      },
    });
  });

  test('it uses track_total_hits if specified', () => {
    query.track_total_hits = true;
    expect(buildSortedEventsQuery(query as BuildSortedEventsQuery)).toEqual({
      allow_no_indices: true,
      index: ['index-name'],
      size: 100,
      ignore_unavailable: true,
      track_total_hits: true,
      body: {
        docvalue_fields: [
          {
            field: 'timefield',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {},
              {
                bool: {
                  filter: [
                    {
                      range: {
                        timefield: {
                          gte: '2021-01-01T00:00:10.123Z',
                          lte: '2021-01-23T12:00:50.321Z',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            timefield: {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'asc',
            },
          },
        ],
      },
    });
  });
});
