/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { TlsData, TlsEdges } from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import { TlsRequestOptions } from './index';

import { TlsAdapter, TlsBuckets } from './types';

import { buildTlsQuery } from './query_tls.dsl';

export class ElasticsearchTlsAdapter implements TlsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getTls(request: FrameworkRequest, options: TlsRequestOptions): Promise<TlsData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildTlsQuery(options);
    const response = await this.framework.callWithRequest<TlsData, TermAggregation>(
      request,
      'search',
      dsl
    );

    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.count.value', response);
    const tlsEdges: TlsEdges[] = getTlsEdges(response, options);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = tlsEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;
    return {
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  }
}

const getTlsEdges = (
  response: DatabaseSearchResponse<TlsData, TermAggregation>,
  options: TlsRequestOptions
): TlsEdges[] => {
  return formatTlsEdges(getOr([], 'aggregations.sha1.buckets', response));
};

export const formatTlsEdges = (buckets: TlsBuckets[]): TlsEdges[] => {
  return buckets.map((bucket: TlsBuckets) => {
    const edge: TlsEdges = {
      node: {
        _id: bucket.key,
        alternativeNames: bucket.alternative_names.buckets.map(({ key }) => key),
        commonNames: bucket.common_names.buckets.map(({ key }) => key),
        ja3: bucket.ja3.buckets.map(({ key }) => key),
        issuerNames: bucket.issuer_names.buckets.map(({ key }) => key),
        // eslint-disable-next-line @typescript-eslint/camelcase
        notAfter: bucket.not_after.buckets.map(({ key_as_string }) => key_as_string),
      },
      cursor: {
        value: bucket.key,
        tiebreaker: null,
      },
    };
    return edge;
  });
};
