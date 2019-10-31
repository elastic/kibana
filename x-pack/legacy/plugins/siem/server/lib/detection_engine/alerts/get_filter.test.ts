/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getQueryFilter, getFilter } from './get_filter';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { AlertServices } from '../../../../../alerting/server/types';

describe('get_filter', () => {
  let savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.get = jest.fn().mockImplementation(() => ({
    attributes: {
      query: { query: 'host.name: linux', language: 'kuery' },
      filters: [],
    },
  }));
  let servicesMock: AlertServices = {
    savedObjectsClient,
    callCluster: jest.fn(),
    alertInstanceFactory: jest.fn(),
  };

  beforeAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get = jest.fn().mockImplementation(() => ({
      attributes: {
        query: { query: 'host.name: linux', language: 'kuery' },
        language: 'kuery',
        filters: [],
      },
    }));
    servicesMock = {
      savedObjectsClient,
      callCluster: jest.fn(),
      alertInstanceFactory: jest.fn(),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getQueryFilter', () => {
    test('it should work with an empty filter as kuery', () => {
      const esQuery = getQueryFilter('host.name: linux', 'kuery', [], ['auditbeat-*']);
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'linux',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with an empty filter as lucene', () => {
      const esQuery = getQueryFilter('host.name: linux', 'lucene', [], ['auditbeat-*']);
      expect(esQuery).toEqual({
        bool: {
          must: [
            {
              query_string: {
                query: 'host.name: linux',
                analyze_wildcard: true,
                time_zone: 'Zulu',
              },
            },
          ],
          filter: [],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter as a kuery', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'kuery',
        [
          {
            meta: {
              alias: 'custom label here',
              disabled: false,
              key: 'host.name',
              negate: false,
              params: {
                query: 'siem-windows',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*']
      );
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'windows',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter that is disabled as a kuery', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'kuery',
        [
          {
            meta: {
              alias: 'custom label here',
              disabled: true,
              key: 'host.name',
              negate: false,
              params: {
                query: 'siem-windows',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*']
      );
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'windows',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter as a lucene', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'lucene',
        [
          {
            meta: {
              alias: 'custom label here',
              disabled: false,
              key: 'host.name',
              negate: false,
              params: {
                query: 'siem-windows',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*']
      );
      expect(esQuery).toEqual({
        bool: {
          must: [
            {
              query_string: {
                query: 'host.name: windows',
                analyze_wildcard: true,
                time_zone: 'Zulu',
              },
            },
          ],
          filter: [
            {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter that is disabled as a lucene', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'lucene',
        [
          {
            meta: {
              alias: 'custom label here',
              disabled: true,
              key: 'host.name',
              negate: false,
              params: {
                query: 'siem-windows',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*']
      );
      expect(esQuery).toEqual({
        bool: {
          must: [
            {
              query_string: {
                query: 'host.name: windows',
                analyze_wildcard: true,
                time_zone: 'Zulu',
              },
            },
          ],
          filter: [],
          should: [],
          must_not: [],
        },
      });
    });
  });

  describe('getFilter', () => {
    test('returns a filter if given a type of filter as is', async () => {
      const filter = await getFilter({
        type: 'filter',
        filter: { something: '1' },
        filters: undefined,
        language: undefined,
        query: undefined,
        savedId: undefined,
        services: servicesMock,
        index: ['auditbeat-*'],
      });
      expect(filter).toEqual({
        something: '1',
      });
    });

    test('returns a query if given a type of query', async () => {
      const filter = await getFilter({
        type: 'query',
        filter: undefined,
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        savedId: undefined,
        services: servicesMock,
        index: ['auditbeat-*'],
      });
      expect(filter).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'siem',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('throws on type query if query is undefined', async () => {
      await expect(
        getFilter({
          type: 'query',
          filter: undefined,
          filters: undefined,
          language: undefined,
          query: 'host.name: siem',
          savedId: undefined,
          services: servicesMock,
          index: ['auditbeat-*'],
        })
      ).rejects.toThrow('query, filters, and index parameter should be defined');
    });

    test('throws on type query if language is undefined', async () => {
      await expect(
        getFilter({
          type: 'query',
          filter: undefined,
          filters: undefined,
          language: 'kuery',
          query: undefined,
          savedId: undefined,
          services: servicesMock,
          index: ['auditbeat-*'],
        })
      ).rejects.toThrow('query, filters, and index parameter should be defined');
    });

    test('throws on type query if index is undefined', async () => {
      await expect(
        getFilter({
          type: 'query',
          filter: undefined,
          filters: undefined,
          language: 'kuery',
          query: 'host.name: siem',
          savedId: undefined,
          services: servicesMock,
          index: undefined,
        })
      ).rejects.toThrow('query, filters, and index parameter should be defined');
    });

    test('returns a saved query if given a type of query', async () => {
      const filter = await getFilter({
        type: 'saved_query',
        filter: undefined,
        filters: undefined,
        language: undefined,
        query: undefined,
        savedId: 'some-id',
        services: servicesMock,
        index: ['auditbeat-*'],
      });
      expect(filter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'linux' } }] } },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('throws on saved query if saved_id is undefined', async () => {
      await expect(
        getFilter({
          type: 'saved_query',
          filter: undefined,
          filters: undefined,
          language: undefined,
          query: undefined,
          savedId: undefined,
          services: servicesMock,
          index: ['auditbeat-*'],
        })
      ).rejects.toThrow('savedId parameter should be defined');
    });

    test('throws on saved query if index is undefined', async () => {
      await expect(
        getFilter({
          type: 'saved_query',
          filter: undefined,
          filters: undefined,
          language: undefined,
          query: undefined,
          savedId: 'some-id',
          services: servicesMock,
          index: undefined,
        })
      ).rejects.toThrow('savedId parameter should be defined');
    });
  });
});
