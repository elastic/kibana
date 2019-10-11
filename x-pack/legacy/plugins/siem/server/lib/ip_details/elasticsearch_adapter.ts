/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import {
  AutonomousSystem,
  DomainsData,
  DomainsEdges,
  FlowTarget,
  GeoEcsFields,
  HostEcsFields,
  IpOverviewData,
  TlsData,
  TlsEdges,
  UsersData,
  UsersEdges,
} from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import {
  DomainsRequestOptions,
  IpOverviewRequestOptions,
  TlsRequestOptions,
  UsersRequestOptions,
} from './index';
import { buildDomainsQuery } from './query_domains.dsl';
import { buildOverviewQuery } from './query_overview.dsl';
import {
  DomainsBuckets,
  IpDetailsAdapter,
  IpOverviewHit,
  OverviewHit,
  OverviewHostHit,
  TlsBuckets,
  UsersBucketsItem,
} from './types';

import { buildTlsQuery } from './query_tls.dsl';

import { buildUsersQuery } from './query_users.dsl';

export class ElasticsearchIpOverviewAdapter implements IpDetailsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getIpDetails(
    request: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<IpOverviewData> {
    const dsl = buildOverviewQuery(options);
    const response = await this.framework.callWithRequest<IpOverviewHit, TermAggregation>(
      request,
      'search',
      dsl
    );

    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return {
      inspect,
      ...getIpOverviewAgg('source', getOr({}, 'aggregations.source', response)),
      ...getIpOverviewAgg('destination', getOr({}, 'aggregations.destination', response)),
      ...getIpOverviewHostAgg(getOr({}, 'aggregations.host', response)),
    };
  }

  public async getDomains(
    request: FrameworkRequest,
    options: DomainsRequestOptions
  ): Promise<DomainsData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildDomainsQuery(options);
    const response = await this.framework.callWithRequest<DomainsData, TermAggregation>(
      request,
      'search',
      dsl
    );

    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.domain_count.value', response);
    const domainsEdges: DomainsEdges[] = getDomainsEdges(response, options);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = domainsEdges.splice(cursorStart, querySize - cursorStart);
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

  public async getUsers(
    request: FrameworkRequest,
    options: UsersRequestOptions
  ): Promise<UsersData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildUsersQuery(options);
    const response = await this.framework.callWithRequest<UsersData, TermAggregation>(
      request,
      'search',
      dsl
    );

    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response);
    const usersEdges = getUsersEdges(response);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = usersEdges.splice(cursorStart, querySize - cursorStart);
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

export const getIpOverviewAgg = (type: string, overviewHit: OverviewHit | {}) => {
  const firstSeen = getOr(null, `firstSeen.value_as_string`, overviewHit);
  const lastSeen = getOr(null, `lastSeen.value_as_string`, overviewHit);
  const autonomousSystem: AutonomousSystem | null = getOr(
    null,
    `as.results.hits.hits[0]._source.${type}.as`,
    overviewHit
  );
  const geoFields: GeoEcsFields | null = getOr(
    null,
    `geo.results.hits.hits[0]._source.${type}.geo`,
    overviewHit
  );

  return {
    [type]: {
      firstSeen,
      lastSeen,
      autonomousSystem: {
        ...autonomousSystem,
      },
      geo: {
        ...geoFields,
      },
    },
  };
};

export const getIpOverviewHostAgg = (overviewHostHit: OverviewHostHit | {}) => {
  const hostFields: HostEcsFields | null = getOr(
    null,
    `results.hits.hits[0]._source.host`,
    overviewHostHit
  );
  return {
    host: {
      ...hostFields,
    },
  };
};

const getDomainsEdges = (
  response: DatabaseSearchResponse<DomainsData, TermAggregation>,
  options: DomainsRequestOptions
): DomainsEdges[] => {
  return formatDomainsEdges(
    getOr([], `aggregations.${options.flowTarget}_domains.buckets`, response),
    options.flowTarget
  );
};

export const formatDomainsEdges = (
  buckets: DomainsBuckets[],
  flowTarget: FlowTarget
): DomainsEdges[] =>
  buckets.map((bucket: DomainsBuckets) => ({
    node: {
      _id: bucket.key,
      [flowTarget]: {
        uniqueIpCount: getOrNumber('uniqueIpCount.value', bucket),
        domainName: bucket.key,
        lastSeen: get('lastSeen.value_as_string', bucket),
      },
      network: {
        bytes: getOrNumber('bytes.value', bucket),
        packets: getOrNumber('packets.value', bucket),
        direction: bucket.direction.buckets.map(bucketDir => bucketDir.key),
      },
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));

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

const getOrNumber = (path: string, bucket: DomainsBuckets) => {
  const numb = get(path, bucket);
  if (numb == null) {
    return null;
  }
  return numb;
};

export const getUsersEdges = (
  response: DatabaseSearchResponse<UsersData, TermAggregation>
): UsersEdges[] =>
  getOr([], `aggregations.users.buckets`, response).map((bucket: UsersBucketsItem) => ({
    node: {
      _id: bucket.key,
      user: {
        id: getOr([], 'id.buckets', bucket).map((id: UsersBucketsItem) => id.key),
        name: bucket.key,
        groupId: getOr([], 'groupId.buckets', bucket).map(
          (groupId: UsersBucketsItem) => groupId.key
        ),
        groupName: getOr([], 'groupName.buckets', bucket).map(
          (groupName: UsersBucketsItem) => groupName.key
        ),
        count: get('doc_count', bucket),
      },
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));
