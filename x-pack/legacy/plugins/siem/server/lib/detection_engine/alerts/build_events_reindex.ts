/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Re-index is just a temporary solution in order to speed up development
// of any front end pieces. This should be replaced with a combination of the file
// build_events_query.ts and any scrolling/scaling solutions from that particular
// file.

export const buildEventsReIndex = () => {
  return {
    body: {
      source: {
        // TODO: Make configurable via paramter passing
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        sort: [
          {
            '@timestamp': 'desc',
          },
          {
            _doc: 'desc',
          },
        ],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  filter: [
                    {
                      bool: {
                        // TODO: Make configurable via parameter passing for KQL compatible queries
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
                                      gte: 1567317600000, // TODO: Make configurable via parameter passing for date time
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
                                      lte: 1569909599999, // TODO: Make configurable via parameter passing for date time
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
      },
      dest: {
        index: 'signals',
      },
      script: {
        // TODO: Make parts of the signals such as severity configurable as that can come from a rule
        source: `
          def signal = [
            "severity": 1,
            "description": "User root activity"
          ];
          ctx._source.signal = signal;
        `,
        lang: 'painless',
      },
      max_docs: 500000, // TODO: Make configurable via parameter passing
    },
  };
};
