/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import {
  FlowTarget,
  NetworkDnsData,
  NetworkDnsEdges,
  NetworkTopNFlowData,
  NetworkTopNFlowEdges,
  NetworkTopNFlowSortField,
} from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';

import { NetworkDnsRequestOptions, NetworkTopNFlowRequestOptions } from './index';
import { buildDnsQuery } from './query_dns.dsl';
import { buildTopNFlowQuery } from './query_top_n_flow.dsl';
import { NetworkAdapter, NetworkDnsBuckets, NetworkTopNFlowBuckets } from './types';
import { Direction } from '../../../public/graphql/types';

export class ElasticsearchNetworkAdapter implements NetworkAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getNetworkTopNFlow(
    request: FrameworkRequest,
    options: NetworkTopNFlowRequestOptions
  ): Promise<NetworkTopNFlowData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildTopNFlowQuery(options);
    const response = await this.framework.callWithRequest<NetworkTopNFlowData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount =
      options.flowTarget === FlowTarget.unified
        ? getOr(0, 'aggregations.top_n_flow_unified_count.value', response)
        : getOr(0, 'aggregations.top_n_flow_count.value', response);
    const networkTopNFlowEdges: NetworkTopNFlowEdges[] = getTopNFlowEdges(response, options);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkTopNFlowEdges.splice(cursorStart, querySize - cursorStart);
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

  public async getNetworkDns(
    request: FrameworkRequest,
    options: NetworkDnsRequestOptions
  ): Promise<NetworkDnsData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildDnsQuery(options);
    const response = await this.framework.callWithRequest<NetworkDnsData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.dns_count.value', response);
    const networkDnsEdges: NetworkDnsEdges[] = formatDnsEdges(
      getOr([], 'aggregations.dns_name_query_count.buckets', response)
    );
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkDnsEdges.splice(cursorStart, querySize - cursorStart);
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

const getTopNFlowEdges = (
  response: DatabaseSearchResponse<NetworkTopNFlowData, TermAggregation>,
  options: NetworkTopNFlowRequestOptions
): NetworkTopNFlowEdges[] => {
  if (options.flowTarget === FlowTarget.destination || options.flowTarget === FlowTarget.source) {
    return formatTopNFlowEdges(
      getOr([], `aggregations.${options.flowTarget}.buckets`, response),
      options.flowTarget
    );
  }
  return formatTopNFlowEdgesUnified(
    [
      ...getOr([], `aggregations.${FlowTarget.source}.buckets`, response),
      ...getOr([], `aggregations.${FlowTarget.destination}.buckets`, response),
    ],
    options.networkTopNFlowSort
  );
};

const getGeo = (result: NetworkTopNFlowBuckets) =>
  result.location.top_geo.hits.hits.length > 0
    ? getOr(
        '',
        `location.top_geo.hits.hits[0]._source.${
          Object.keys(result.location.top_geo.hits.hits[0]._source)[0]
        }.geo.country_iso_code`,
        result
      )
    : '';

const getAs = (result: NetworkTopNFlowBuckets) =>
  result.autonomous_system.top_as.hits.hits.length > 0
    ? getOr(
        '',
        `autonomous_system.top_as.hits.hits[0]._source.${
          Object.keys(result.autonomous_system.top_as.hits.hits[0]._source)[0]
        }.as.organization.name`,
        result
      )
    : '';

const unifiedSorter = (networkTopNFlowSortField: NetworkTopNFlowSortField) => {
  if (networkTopNFlowSortField.direction === Direction.asc) {
    return (a: NetworkTopNFlowEdges, b: NetworkTopNFlowEdges) =>
      getOrNumber(`node.network[${networkTopNFlowSortField.field}]`, a) -
      getOrNumber(`node.network[${networkTopNFlowSortField.field}]`, b);
  }
  return (a: NetworkTopNFlowEdges, b: NetworkTopNFlowEdges) =>
    getOrNumber(`node.network[${networkTopNFlowSortField.field}]`, b) -
    getOrNumber(`node.network[${networkTopNFlowSortField.field}]`, a);
};

const formatTopNFlowEdgesUnified = (
  buckets: NetworkTopNFlowBuckets[],
  networkTopNFlowSortField: NetworkTopNFlowSortField
): NetworkTopNFlowEdges[] =>
  Object.values(
    buckets.reduce(
      (acc, bucket) => {
        if (!acc[bucket.key]) {
          return {
            ...acc,
            [bucket.key]: {
              node: {
                _id: bucket.key,
                unified: {
                  domain: bucket.domain.buckets.map(bucketDomain => bucketDomain.key),
                  ip: bucket.key,
                  location: getGeo(bucket),
                  autonomous_system: getAs(bucket),
                },
                network: {
                  bytes_in: getOrNumber('bytes_in.value', bucket),
                  bytes_out: getOrNumber('bytes_out.value', bucket),
                },
              },
              cursor: {
                value: bucket.key,
                tiebreaker: null,
              },
            },
          };
        }
        return {
          ...acc,
          [bucket.key]: {
            node: {
              _id: bucket.key,
              unified: {
                domain: bucket.domain.buckets.map(bucketDomain => bucketDomain.key),
                ip: bucket.key,
                location:
                  getOr('', 'node.unified.location', acc[bucket.key]).length === 0
                    ? getGeo(bucket)
                    : getOr('', 'node.unified.location', acc[bucket.key]),
                autonomous_system:
                  getOr('', 'node.unified.autonomous_system', acc[bucket.key]).length === 0
                    ? getAs(bucket)
                    : getOr('', 'node.unified.autonomous_system', acc[bucket.key]),
              },
              network: {
                bytes_in:
                  getOrNumber('bytes_in.value', bucket) +
                  getOrNumber('node.unified.bytes_in', acc[bucket.key]),
                bytes_out:
                  getOrNumber('bytes_out.value', bucket) +
                  getOrNumber('node.unified.bytes_out', acc[bucket.key]),
              },
            },
            cursor: {
              value: bucket.key,
              tiebreaker: null,
            },
          },
        };
      },
      {} as { [key: string]: NetworkTopNFlowEdges }
    )
  ).sort(unifiedSorter(networkTopNFlowSortField));

const formatTopNFlowEdges = (
  buckets: NetworkTopNFlowBuckets[],
  flowTarget: FlowTarget
): NetworkTopNFlowEdges[] =>
  buckets.map((bucket: NetworkTopNFlowBuckets) => ({
    node: {
      _id: bucket.key,
      [flowTarget]: {
        domain: bucket.domain.buckets.map(bucketDomain => bucketDomain.key),
        ip: bucket.key,
        location: getOr(
          '',
          `location.top_geo.hits.hits[0]._source.${flowTarget}.geo.country_iso_code`,
          bucket
        ),
        autonomous_system: getOr(
          '',
          `autonomous_system.top_as.hits.hits[0]._source.${flowTarget}.as.organization.name`,
          bucket
        ),
      },
      network: {
        bytes_in: getOrNumber('bytes_in.value', bucket),
        bytes_out: getOrNumber('bytes_out.value', bucket),
      },
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));

const formatDnsEdges = (buckets: NetworkDnsBuckets[]): NetworkDnsEdges[] =>
  buckets.map((bucket: NetworkDnsBuckets) => ({
    node: {
      _id: bucket.key,
      dnsBytesIn: getOrNumber('dns_bytes_in.value', bucket),
      dnsBytesOut: getOrNumber('dns_bytes_out.value', bucket),
      dnsName: bucket.key,
      queryCount: bucket.doc_count,
      uniqueDomains: getOrNumber('unique_domains.value', bucket),
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));

const getOrNumber = (
  path: string,
  bucket: NetworkTopNFlowBuckets | NetworkDnsBuckets | NetworkTopNFlowEdges
) => {
  const numb = get(path, bucket);
  if (numb == null) {
    return null;
  }
  return numb;
};
