/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import {
  AuthenticationsData,
  AuthenticationsEdges,
  AuthenticationsOverTimeData,
  MatrixOverTimeHistogramData,
} from '../../graphql/types';
import { mergeFieldsWithHit, inspectStringifyObject } from '../../utils/build_query';
import {
  FrameworkAdapter,
  FrameworkRequest,
  RequestOptionsPaginated,
  MatrixHistogramRequestOptions,
} from '../framework';
import { TermAggregation } from '../types';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';

import { auditdFieldsMap, buildQuery } from './query.dsl';
import { buildAuthenticationsOverTimeQuery } from './query.authentications_over_time.dsl';
import {
  AuthenticationBucket,
  AuthenticationData,
  AuthenticationHit,
  AuthenticationsAdapter,
  AuthenticationsActionGroupData,
} from './types';

const getAuthenticationsOverTimeByAuthenticationResult = (
  data: AuthenticationsActionGroupData[]
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach(({ key: group, events }) => {
    const eventsData = getOr([], 'buckets', events).map(
      ({ key, doc_count }: { key: number; doc_count: number }) => ({
        x: key,
        y: doc_count,
        g: group,
      })
    );
    result = [...result, ...eventsData];
  });

  return result;
};

export class ElasticsearchAuthenticationAdapter implements AuthenticationsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getAuthentications(
    request: FrameworkRequest,
    options: RequestOptionsPaginated
  ): Promise<AuthenticationsData> {
    const dsl = buildQuery(options);
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const response = await this.framework.callWithRequest<AuthenticationData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const hits: AuthenticationHit[] = getOr(
      [],
      'aggregations.group_by_users.buckets',
      response
    ).map((bucket: AuthenticationBucket) => ({
      _id: getOr(
        `${bucket.key}+${bucket.doc_count}`,
        'failures.lastFailure.hits.hits[0].id',
        bucket
      ),
      _source: {
        lastSuccess: getOr(null, 'successes.lastSuccess.hits.hits[0]._source', bucket),
        lastFailure: getOr(null, 'failures.lastFailure.hits.hits[0]._source', bucket),
      },
      user: bucket.key,
      failures: bucket.failures.doc_count,
      successes: bucket.successes.doc_count,
    }));
    const authenticationEdges: AuthenticationsEdges[] = hits.map(hit =>
      formatAuthenticationData(options.fields, hit, auditdFieldsMap)
    );

    const edges = authenticationEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      inspect,
      edges,
      totalCount,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  }

  public async getAuthenticationsOverTime(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<AuthenticationsOverTimeData> {
    const dsl = buildAuthenticationsOverTimeQuery(options);
    const response = await this.framework.callWithRequest<AuthenticationHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const totalCount = getOr(0, 'hits.total.value', response);
    const authenticationsOverTimeBucket = getOr(
      [],
      'aggregations.eventActionGroup.buckets',
      response
    );
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      AuthenticationsOverTimeByModule: getAuthenticationsOverTimeByAuthenticationResult(
        authenticationsOverTimeBucket
      ),
      totalCount,
    };
  }
}

export const formatAuthenticationData = (
  fields: readonly string[],
  hit: AuthenticationHit,
  fieldMap: Readonly<Record<string, string>>
): AuthenticationsEdges =>
  fields.reduce<AuthenticationsEdges>(
    (flattenedFields, fieldName) => {
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      flattenedFields.node = {
        ...flattenedFields.node,
        ...{
          _id: hit._id,
          user: { name: [hit.user] },
          failures: hit.failures,
          successes: hit.successes,
        },
      };
      return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
    },
    {
      node: {
        failures: 0,
        successes: 0,
        _id: '',
        user: {
          name: [''],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );
