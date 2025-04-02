/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const inactiveAlertsQuery = (days: number = 30, spaceId: string = 'space-1') => ({
  bool: {
    should: [
      {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      should: [{ match_phrase: { 'kibana.alert.workflow_status': 'closed' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        { match_phrase: { 'kibana.alert.workflow_status': 'acknowledged' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  { range: { 'kibana.alert.workflow_status_updated_at': { lt: `now-${days}d` } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          bool: {
                            should: [{ match_phrase: { 'kibana.alert.status': 'untracked' } }],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [{ match_phrase: { 'kibana.alert.status': 'recovered' } }],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ range: { 'kibana.alert.end': { lt: `now-${days}d` } } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
            {
              bool: {
                should: [{ match: { 'kibana.space_ids': spaceId } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

export const activeAlertsQuery = (days: number = 45, spaceId: string = 'space-1') => ({
  bool: {
    filter: [
      {
        bool: {
          minimum_should_match: 1,
          should: [{ match_phrase: { 'kibana.alert.status': 'active' } }],
        },
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [{ range: { 'kibana.alert.start': { lt: `now-${days}d` } } }],
        },
      },
      {
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [{ exists: { field: 'kibana.alert.end' } }],
            },
          },
        },
      },
      {
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [{ exists: { field: 'kibana.alert.workflow_status_updated_at' } }],
            },
          },
        },
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [{ match: { 'kibana.space_ids': spaceId } }],
        },
      },
    ],
  },
});
