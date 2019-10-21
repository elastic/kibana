/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses, assertUnreachable } from '../../utils/build_query';

import { TlsRequestOptions } from './index';
import { TlsSortField, Direction, TlsFields } from '../../graphql/types';

const getAggs = (querySize: number, sort: TlsSortField) => ({
  count: {
    cardinality: {
      field: 'tls.server_certificate.fingerprint.sha1',
    },
  },
  sha1: {
    terms: {
      field: 'tls.server_certificate.fingerprint.sha1',
      size: querySize,
      order: {
        ...getQueryOrder(sort),
      },
    },
    aggs: {
      issuer_names: {
        terms: {
          field: 'tls.server_certificate.issuer.common_name',
        },
      },
      common_names: {
        terms: {
          field: 'tls.server_certificate.subject.common_name',
        },
      },
      alternative_names: {
        terms: {
          field: 'tls.server_certificate.alternative_names',
        },
      },
      not_after: {
        terms: {
          field: 'tls.server_certificate.not_after',
        },
      },
      ja3: {
        terms: {
          field: 'tls.fingerprints.ja3.hash',
        },
      },
    },
  },
});

export const buildTlsQuery = ({
  ip,
  sort,
  filterQuery,
  flowTarget,
  pagination: { querySize },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
}: TlsRequestOptions) => {
  const defaultFilter = [
    ...createQueryFilterClauses(filterQuery),
    { range: { [timestamp]: { gte: from, lte: to } } },
  ];

  const filter = ip ? [...defaultFilter, { term: { [`${flowTarget}.ip`]: ip } }] : defaultFilter;

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggs: {
        ...getAggs(querySize, sort),
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};

interface QueryOrder {
  _key: Direction;
}

const getQueryOrder = (sort: TlsSortField): QueryOrder => {
  switch (sort.field) {
    case TlsFields._id:
      return { _key: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
