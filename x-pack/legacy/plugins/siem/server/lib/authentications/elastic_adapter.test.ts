/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticationsEdges } from '../../graphql/types';

import { formatAuthenticationData } from './elasticsearch_adapter';
import { auditdFieldsMap } from './query.dsl';
import { AuthenticationHit } from './types';

describe('authentications elasticsearch_adapter', () => {
  describe('#formatAuthenticationsData', () => {
    const hit: AuthenticationHit = {
      _index: 'index-123',
      _type: 'type-123',
      _id: 'id-123',
      _score: 10,
      _source: {
        '@timestamp': 'time-1',
      },
      cursor: 'cursor-1',
      sort: [0],
      user: 'Evan',
      failures: 10,
      successes: 20,
    };

    test('it formats a authentication with an empty set', () => {
      const fields: readonly string[] = [''];
      const data = formatAuthenticationData(fields, hit, auditdFieldsMap);
      const expected: AuthenticationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          user: {
            name: ['Evan'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a authentications with a source ip correctly', () => {
      const fields: readonly string[] = ['lastSuccess.source.ip'];
      const data = formatAuthenticationData(fields, hit, auditdFieldsMap);
      const expected: AuthenticationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          user: {
            name: ['Evan'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a authentications with a host name only', () => {
      const fields: readonly string[] = ['lastSuccess.host.name'];
      const data = formatAuthenticationData(fields, hit, auditdFieldsMap);
      const expected: AuthenticationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          user: {
            name: ['Evan'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a authentications with a host id only', () => {
      const fields: readonly string[] = ['lastSuccess.host.id'];
      const data = formatAuthenticationData(fields, hit, auditdFieldsMap);
      const expected: AuthenticationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          user: {
            name: ['Evan'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a authentications with a host name and id correctly', () => {
      const fields: readonly string[] = ['lastSuccess.host.name', 'lastSuccess.host.id'];
      const data = formatAuthenticationData(fields, hit, auditdFieldsMap);
      const expected: AuthenticationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          user: {
            name: ['Evan'],
          },
        },
      };

      expect(data).toEqual(expected);
    });
  });
});
