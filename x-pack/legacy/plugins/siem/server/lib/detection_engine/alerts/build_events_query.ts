/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultIndexPattern } from '../../../../default_index_pattern';

// TODO: See build_events_reindex.ts for all the spots to make things "configurable"
// here but this is intended to replace the build_events_reindex.ts
export const buildEventsScrollQuery = ({
  index,
  from,
  to,
  severity,
  description,
  name,
  timeDetected,
  ruleRevision,
  ruleId,
  ruleType,
  references,
}: BuildEventsScrollQuery) => {
  return {
    allowNoIndices: true,
    index: defaultIndexPattern,
    scroll: '30s',
    size: 10,
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
                                    gte: from,
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
                                    lte: to,
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
          _doc: 'desc',
        },
      ],
    },
  };
};
