/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getHostDetailsEventsKqlQueryExpression, getHostDetailsPageFilters } from './helpers';
import { Filter } from '../../../../../../../../src/plugins/data/common/es_query';

describe('hosts page helpers', () => {
  describe('getHostDetailsEventsKqlQueryExpression', () => {
    const filterQueryExpression = 'user.name: "root"';
    const hostName = 'foo';

    it('combines the filterQueryExpression and hostname when both are NOT empty', () => {
      expect(getHostDetailsEventsKqlQueryExpression({ filterQueryExpression, hostName })).toEqual(
        'user.name: "root" and host.name: "foo"'
      );
    });

    it('returns just the filterQueryExpression when it is NOT empty, but hostname is empty', () => {
      expect(
        getHostDetailsEventsKqlQueryExpression({ filterQueryExpression, hostName: '' })
      ).toEqual('user.name: "root"');
    });

    it('returns just the hostname when filterQueryExpression is empty, but hostname is NOT empty', () => {
      expect(
        getHostDetailsEventsKqlQueryExpression({ filterQueryExpression: '', hostName })
      ).toEqual('host.name: "foo"');
    });

    it('returns an empty string when both the filterQueryExpression and hostname are empty', () => {
      expect(
        getHostDetailsEventsKqlQueryExpression({ filterQueryExpression: '', hostName: '' })
      ).toEqual('');
    });
  });

  describe('getHostDetailsPageFilters', () => {
    it('correctly constructs pageFilters for the given hostName', () => {
      const expected: Filter[] = [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.name',
            value: 'host-1',
            params: {
              query: 'host-1',
            },
          },
          query: {
            match: {
              'host.name': {
                query: 'host-1',
                type: 'phrase',
              },
            },
          },
        },
      ];
      expect(getHostDetailsPageFilters('host-1')).toEqual(expected);
    });
  });
});
