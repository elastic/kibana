/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import { UncommonProcessesData, UncommonProcessesEdges } from '../../graphql/types';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { processFieldsMap, userFieldsMap } from '../ecs_fields';
import { FrameworkAdapter, FrameworkRequest, RequestOptions } from '../framework';
import { HostHits, TermAggregation } from '../types';

import { buildQuery } from './query.dsl';
import {
  UncommonProcessBucket,
  UncommonProcessData,
  UncommonProcessesAdapter,
  UncommonProcessHit,
} from './types';

export class ElasticsearchUncommonProcessesAdapter implements UncommonProcessesAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getUncommonProcesses(
    request: FrameworkRequest,
    options: RequestOptions
  ): Promise<UncommonProcessesData> {
    const response = await this.framework.callWithRequest<UncommonProcessData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );
    const { cursor, limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.process_count.value', response);
    const buckets = getOr([], 'aggregations.group_by_process.buckets', response);
    const hits = getHits(buckets);

    const uncommonProcessesEdges = hits.map(hit =>
      formatUncommonProcessesData(options.fields, hit, { ...processFieldsMap, ...userFieldsMap })
    );
    const hasNextPage = uncommonProcessesEdges.length === limit + 1;
    const beginning = cursor != null ? parseInt(cursor!, 10) : 0;
    const edges = uncommonProcessesEdges.splice(beginning, limit - beginning);
    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        endCursor: {
          value: String(limit),
          tiebreaker: null,
        },
      },
    };
  }
}

export const getHits = (
  buckets: ReadonlyArray<UncommonProcessBucket>
): ReadonlyArray<UncommonProcessHit> =>
  buckets.map((bucket: Readonly<UncommonProcessBucket>) => ({
    _id: bucket.process.hits.hits[0]._id,
    _index: bucket.process.hits.hits[0]._index,
    _type: bucket.process.hits.hits[0]._type,
    _score: bucket.process.hits.hits[0]._score,
    _source: bucket.process.hits.hits[0]._source,
    sort: bucket.process.hits.hits[0].sort,
    cursor: bucket.process.hits.hits[0].cursor,
    total: bucket.process.hits.total,
    host: getHosts(bucket.hosts.buckets),
  }));

export const getHosts = (buckets: ReadonlyArray<{ key: string; host: HostHits }>) =>
  buckets.map(bucket => {
    const source = get('host.hits.hits[0]._source', bucket);
    return {
      id: [bucket.key],
      name: get('host.name', source),
    };
  });

export const formatUncommonProcessesData = (
  fields: ReadonlyArray<string>,
  hit: UncommonProcessHit,
  fieldMap: Readonly<Record<string, string>>
): UncommonProcessesEdges =>
  fields.reduce<UncommonProcessesEdges>(
    (flattenedFields, fieldName) => {
      flattenedFields.node._id = hit._id;
      flattenedFields.node.instances = getOr(0, 'total.value', hit);
      flattenedFields.node.hosts = hit.host;
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
    },
    {
      node: {
        _id: '',
        instances: 0,
        process: {},
        hosts: [],
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );
