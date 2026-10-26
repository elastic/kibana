/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processFilters } from './process_filters';
import { CONTROLLED_BY_SWIM_LANE_FILTER } from '../..';

describe('processFilters', () => {
  test('should format kql embeddable input to es query', () => {
    expect(
      processFilters(
        [
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              type: 'phrases',
              key: 'instance',
              value: 'i-20d061fa',
              params: ['i-20d061fa'],
              alias: null,
              negate: false,
              disabled: false,
            },
            query: {
              bool: {
                should: [
                  {
                    match_phrase: {
                      instance: 'i-20d061fa',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: true,
              disabled: false,
              type: 'phrase',
              key: 'instance',
              params: {
                query: 'i-16fd8d2a',
              },
            },
            query: {
              match_phrase: {
                instance: 'i-16fd8d2a',
              },
            },

            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: false,
              disabled: false,
              type: 'exists',
              key: 'instance',
              value: 'exists',
            },
            exists: {
              field: 'instance',
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: false,
              disabled: true,
              type: 'exists',
              key: 'instance',
              value: 'exists',
            },
            exists: {
              field: 'region',
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
        ],
        {
          language: 'kuery',
          query: 'instance : "i-088147ac"',
        },
        CONTROLLED_BY_SWIM_LANE_FILTER
      )
    ).toEqual({
      bool: {
        filter: [
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    instance: 'i-088147ac',
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
                    instance: 'i-20d061fa',
                  },
                },
              ],
            },
          },
          {
            exists: {
              field: 'instance',
            },
          },
        ],
        must: [],
        must_not: [
          {
            match_phrase: {
              instance: 'i-16fd8d2a',
            },
          },
        ],
        should: [],
      },
    });
  });

  test('should format lucene embeddable input to es query', () => {
    expect(
      processFilters(
        [
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              type: 'phrases',
              key: 'instance',
              value: 'i-20d061fa',
              params: ['i-20d061fa'],
              alias: null,
              negate: false,
              disabled: false,
            },
            query: {
              bool: {
                should: [
                  {
                    match_phrase: {
                      instance: 'i-20d061fa',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: true,
              disabled: false,
              type: 'phrase',
              key: 'instance',
              params: {
                query: 'i-16fd8d2a',
              },
            },
            query: {
              match_phrase: {
                instance: 'i-16fd8d2a',
              },
            },

            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: false,
              disabled: false,
              type: 'exists',
              key: 'instance',
              value: 'exists',
            },
            exists: {
              field: 'instance',
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: false,
              disabled: true,
              type: 'exists',
              key: 'instance',
              value: 'exists',
            },
            exists: {
              field: 'region',
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
        ],
        {
          language: 'lucene',
          query: 'instance:i-d**',
        },
        CONTROLLED_BY_SWIM_LANE_FILTER
      )
    ).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  match_phrase: {
                    instance: 'i-20d061fa',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            exists: {
              field: 'instance',
            },
          },
        ],
        must: [
          {
            query_string: {
              query: 'instance:i-d**',
            },
          },
        ],
        must_not: [
          {
            match_phrase: {
              instance: 'i-16fd8d2a',
            },
          },
        ],
        should: [],
      },
    });
  });
});
