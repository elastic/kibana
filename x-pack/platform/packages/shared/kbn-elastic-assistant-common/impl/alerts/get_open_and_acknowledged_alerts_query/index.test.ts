/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOpenAndAcknowledgedAlertsQuery } from '.';

interface MaybeHasFilter {
  filter?: Array<Record<string, unknown>>;
}

interface MaybeTimestampValues {
  format?: string;
  gte?: string;
  lte?: string;
}

interface MaybeHasRange {
  range?: {
    '@timestamp'?: MaybeTimestampValues;
  };
}

describe('getOpenAndAcknowledgedAlertsQuery', () => {
  const alertsIndexPattern = 'alerts-*';
  const anonymizationFields = [
    { id: 'field1', field: 'field1', allowed: true, anonymized: false },
    { id: 'field2', field: 'field2', allowed: true, anonymized: false },
    { id: 'field3', field: 'field3', allowed: false, anonymized: false },
  ];
  const size = 10;

  it('returns the expected query', () => {
    const query = getOpenAndAcknowledgedAlertsQuery({
      alertsIndexPattern,
      anonymizationFields,
      size,
    });

    expect(query).toEqual({
      allow_no_indices: true,
      body: {
        fields: [
          { field: 'field1', include_unmapped: true },
          { field: 'field2', include_unmapped: true },
        ],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [],
                  filter: [
                    {
                      bool: {
                        should: [
                          {
                            match_phrase: {
                              'kibana.alert.workflow_status': 'open',
                            },
                          },
                          {
                            match_phrase: {
                              'kibana.alert.workflow_status': 'acknowledged',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          gte: 'now-24h',
                          lte: 'now',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                  should: [],
                  must_not: [
                    {
                      exists: {
                        field: 'kibana.alert.building_block_type',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        runtime_mappings: {},
        size: 10,
        sort: [
          { 'kibana.alert.risk_score': { order: 'desc' } },
          { '@timestamp': { order: 'desc' } },
        ],
        _source: false,
      },
      ignore_unavailable: true,
      index: ['alerts-*'],
    });
  });

  it('includes (optional) filters in the query when they are provided', () => {
    const filter = {
      bool: {
        must: [],
        filter: [
          {
            match_phrase: {
              'user.name': 'root',
            },
          },
        ],
        should: [],
        must_not: [
          {
            match_phrase: {
              'host.name': 'foo',
            },
          },
        ],
      },
    };

    const query = getOpenAndAcknowledgedAlertsQuery({
      alertsIndexPattern,
      anonymizationFields,
      filter,
      size,
    });

    expect(query.body.query.bool.filter).toEqual([
      {
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      'kibana.alert.workflow_status': 'open',
                    },
                  },
                  {
                    match_phrase: {
                      'kibana.alert.workflow_status': 'acknowledged',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            filter, // <-- optional filters are included here
            {
              range: {
                '@timestamp': {
                  gte: 'now-24h',
                  lte: 'now',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          should: [],
          must_not: [
            {
              exists: {
                field: 'kibana.alert.building_block_type',
              },
            },
          ],
        },
      },
    ]);
  });

  it('includes start when it is provided', () => {
    const start = '2025-01-01T00:00:00.000Z';

    const query = getOpenAndAcknowledgedAlertsQuery({
      alertsIndexPattern,
      anonymizationFields,
      size,
      start,
    });

    const rangeFilter: MaybeHasRange | undefined = (
      query.body.query.bool.filter[0].bool as MaybeHasFilter
    ).filter?.find((x) => Object.hasOwn(x, 'range'));

    const timestamp: MaybeTimestampValues | undefined = rangeFilter?.range?.['@timestamp'];

    expect(timestamp?.gte).toEqual(start);
  });

  it('includes end when it is provided', () => {
    const end = '2025-01-02T00:00:00.000Z';

    const query = getOpenAndAcknowledgedAlertsQuery({
      alertsIndexPattern,
      anonymizationFields,
      size,
      end,
    });

    const rangeFilter: MaybeHasRange | undefined = (
      query.body.query.bool.filter[0].bool as MaybeHasFilter
    ).filter?.find((x) => Object.hasOwn(x, 'range'));

    const timestamp: MaybeTimestampValues | undefined = rangeFilter?.range?.['@timestamp'];

    expect(timestamp?.lte).toEqual(end);
  });
});
