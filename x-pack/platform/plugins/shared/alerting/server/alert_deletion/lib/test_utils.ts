/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const inactiveAlertsQuery = (days: number = 30, spaceId: string = 'space-1') => ({
  bool: {
    filter: [
      {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'kibana.alert.workflow_status': 'closed',
                                },
                              },
                            ],
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'kibana.alert.workflow_status': 'acknowledged',
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          range: {
                            'kibana.alert.workflow_status_updated_at': {
                              lt: `now-${days}d`,
                            },
                          },
                        },
                      ],
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
                      minimum_should_match: 1,
                      should: [
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'kibana.alert.status': 'untracked',
                                },
                              },
                            ],
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'kibana.alert.status': 'recovered',
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          range: {
                            'kibana.alert.end': {
                              lt: `now-${days}d`,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  exists: {
                    field: 'kibana.alert.case_ids',
                  },
                },
              ],
            },
          },
        },
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              match: {
                'kibana.space_ids': spaceId,
              },
            },
          ],
        },
      },
    ],
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
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [{ exists: { field: 'kibana.alert.case_ids' } }],
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
