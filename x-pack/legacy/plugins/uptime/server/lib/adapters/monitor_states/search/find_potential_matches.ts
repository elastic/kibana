/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { QueryContext } from '../elasticsearch_monitor_states_adapter';
import { CursorDirection } from '../../../../../common/graphql/types';
import { INDEX_NAMES } from '../../../../../common/constants';

// This is the first phase of the query. In it, we find the most recent check groups that matched the given query.
// Note that these check groups may not be the most recent groups for the matching monitor ID! We'll filter those
// out in the next phase.
export const findPotentialMatches = async (
  queryContext: QueryContext,
  searchAfter: any,
  size: number
) => {
  const queryResult = await query(queryContext, searchAfter, size);

  const checkGroups = new Set<string>();
  const monitorIds: string[] = [];
  get<any>(queryResult, 'aggregations.monitors.buckets', []).forEach((b: any) => {
    const monitorId = b.key.monitor_id;
    monitorIds.push(monitorId);

    // Doc count can be zero if status filter optimization does not match
    if (b.summaries.doc_count > 0) {
      // Here we grab the most recent 2 check groups per location and add them to the list.
      // Why 2? Because the most recent one may be a partial result from mode: all, and hence not match a summary doc.
      b.summaries.locations.buckets.forEach((b: any) => {
        b.top.hits.hits.forEach( (h: any) => {
          checkGroups.add(h._source.monitor.check_group);
        });
      });
    }
  });

  return {
    monitorIds,
    checkGroups,
    searchAfter: queryResult.aggregations.monitors.after_key,
  };
};

const query = async (queryContext: QueryContext, searchAfter: any, size: number) => {
  const body = queryBody(queryContext, searchAfter, size);

  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body,
  };

  return await queryContext.database.search(queryContext.request, params);
};

const queryBody = (queryContext: QueryContext, searchAfter: any, size: number) => {
  const compositeOrder = cursorDirectionToOrder(queryContext.pagination.cursorDirection);

  const queryClause = queryContext.filterClause || { match_all: {} };

  // This clause is an optimization for the case where we only want to show 'up' monitors.
  // We know we can exclude any down matches because an 'up' monitor may not have any 'down' matches.
  // However, we can't optimize anything in any other case, because a sibling check in the same check_group
  // or in another location may have a different status.
  const statusFilterClause =
    queryContext.statusFilter && queryContext.statusFilter === 'up'
      ? { match: { 'summary.down': 0 } }
      : { exists: { field: 'summary.down' } };

  const body = {
    size: 0,
    query: queryClause,
    aggs: {
      monitors: {
        composite: {
          size,
          sources: [
            {
              monitor_id: { terms: { field: 'monitor.id', order: compositeOrder } },
            },
          ],
        },
        aggs: {
          summaries: {
            filter: { bool: { filter: [statusFilterClause] } },
            aggs: {
              // Here we grab the most recent 2 check groups per location.
              // Why 2? Because the most recent one may not be for a summary, it may be incomplete.
              locations: {
                terms: {field: "observer.geo.name", missing: "__missing__"},
                aggs: {
                  top: {
                    top_hits: {
                      sort: [{ '@timestamp': 'desc' }],
                      _source: {
                        includes: ['monitor.check_group', '@timestamp', 'summary.up', 'summary.down'],
                      },
                      size: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  if (searchAfter) {
    set(body, 'aggs.monitors.composite.after', searchAfter);
  }

  return body;
};

const cursorDirectionToOrder = (cd: CursorDirection): 'asc' | 'desc' => {
  return CursorDirection[cd] === CursorDirection.AFTER ? 'asc' : 'desc';
};
