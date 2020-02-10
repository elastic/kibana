/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addFilterStateIfNotThere } from './';

import { esFilters } from '../../../../../../../../../../src/plugins/data/public';

describe('description_step', () => {
  describe('addFilterStateIfNotThere', () => {
    test('it does not change the state if it is global', () => {
      const filters: esFilters.Filter[] = [
        {
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
        {
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
      ];
      const output = addFilterStateIfNotThere(filters);
      const expected: esFilters.Filter[] = [
        {
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
        {
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it adds the state if it does not exist as local', () => {
      const filters: esFilters.Filter[] = [
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
      ];
      const output = addFilterStateIfNotThere(filters);
      const expected: esFilters.Filter[] = [
        {
          $state: {
            store: esFilters.FilterStateStore.APP_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
        {
          $state: {
            store: esFilters.FilterStateStore.APP_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
      ];
      expect(output).toEqual(expected);
    });
  });
});
