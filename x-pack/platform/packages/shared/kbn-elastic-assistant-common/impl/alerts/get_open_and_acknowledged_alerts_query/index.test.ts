/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOpenAndAcknowledgedAlertsQuery } from '.';

describe('getOpenAndAcknowledgedAlertsQuery', () => {
  it('returns the expected query', () => {
    const alertsIndexPattern = 'alerts-*';
    const anonymizationFields = [
      { id: 'field1', field: 'field1', allowed: true, anonymized: false },
      { id: 'field2', field: 'field2', allowed: true, anonymized: false },
    ];
    const size = 10;

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
});
