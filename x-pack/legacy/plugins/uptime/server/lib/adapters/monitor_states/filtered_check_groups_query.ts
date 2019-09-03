/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { INDEX_NAMES } from '../../../../common/constants';
import { MonitorIdWithGroups } from './monitor_id_with_groups';
import { CursorDirection } from '../../../../common/graphql/types';

export const filteredCheckGroupsQuery = async (
  queryContext: QueryContext,
  searchAfter: any,
  size: number
) => {
  const body = filteredCheckGroupsQueryBody(queryContext, searchAfter, size);

  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body,
  };

  return await queryContext.database.search(queryContext.request, params);
};

const filteredCheckGroupsQueryBody = (
  queryContext: QueryContext,
  searchAfter: any,
  size: number
) => {
  const compositeOrder = cursorDirectionToOrder(queryContext.pagination.cursorDirection);

  const query = queryContext.filterClause.filter || { match_all: {} };

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
    query,
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
              top: {
                top_hits: {
                  sort: [{ '@timestamp': 'desc' }],
                  _source: {
                    includes: ['monitor.check_group', '@timestamp', 'summary.up', 'summary.down'],
                  },
                  size: 1,
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

export interface CheckGroupsPageResult {
  monitorIdGroups: MonitorIdWithGroups[];
  searchAfter: string;
}

const cursorDirectionToOrder = (cd: CursorDirection): 'asc' | 'desc' => {
  return CursorDirection[cd] === CursorDirection.AFTER ? 'asc' : 'desc';
};
