/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: See build_events_reindex.ts for all the spots to make things "configurable"
// here but this is intended to replace the build_events_reindex.ts
export const buildEventsQuery = () => {
  return {
    allowNoIndices: true,
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          match_phrase: {
                            'user.name': 'root',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      filter: [
                        {
                          bool: {
                            should: [
                              {
                                range: {
                                  '@timestamp': {
                                    gte: 1567317600000,
                                  },
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [
                              {
                                range: {
                                  '@timestamp': {
                                    lte: 1569909599999,
                                  },
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              match_all: {},
            },
          ],
        },
      },
      size: 26,
      track_total_hits: true,
      sort: [
        {
          '@timestamp': 'desc',
        },
        {
          _doc: 'desc',
        },
      ],
    },
  };
};
