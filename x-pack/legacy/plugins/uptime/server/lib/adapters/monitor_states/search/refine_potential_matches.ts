/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_NAMES } from '../../../../../common/constants';
import { QueryContext } from '../elasticsearch_monitor_states_adapter';
import { CursorDirection } from '../../../../../common/graphql/types';
import { MonitorGroups, MonitorLocCheckGroup } from './fetch_page';

// This is the second phase of the query, it determines whether the provided check groups are the latest complete
// check groups for their asociated monitor IDs. If not, it discards the result.
export const refinePotentialMatches = async (
  queryContext: QueryContext,
  monitorIds: string[],
  filteredCheckGroups: Set<string>
): Promise<MonitorGroups[]> => {
  if (monitorIds.length === 0) {
    return [];
  }

  const recentGroupsMatchingStatus = await fullyMatchingIds(
    queryContext,
    monitorIds,
    filteredCheckGroups
  );

  // Return the monitor groups filtering out things potential matches that weren't current
  const matches: MonitorGroups[] = monitorIds
    .map((id: string) => {
      return { id, groups: recentGroupsMatchingStatus.get(id) || [] };
    })
    .filter(mrg => mrg.groups.length > 0);

  // Sort matches by ID
  matches.sort((a: MonitorGroups, b: MonitorGroups) => {
    return a.id === b.id ? 0 : a.id > b.id ? 1 : -1;
  });

  if (queryContext.pagination.cursorDirection === CursorDirection.BEFORE) {
    matches.reverse();
  }
  return matches;
};

const fullyMatchingIds = async (
  queryContext: QueryContext,
  monitorIds: string[],
  filteredCheckGroups: Set<string>
) => {
  const mostRecentQueryResult = await mostRecentCheckGroups(queryContext, monitorIds);

  const matching = new Map<string, MonitorLocCheckGroup[]>();
  MonitorLoop: for (const monBucket of mostRecentQueryResult.aggregations.monitor.buckets) {
    const monitorId: string = monBucket.key;
    const groups: MonitorLocCheckGroup[] = [];
    for (const locBucket of monBucket.location.buckets) {
      const location = locBucket.key;
      const topSource = locBucket.top.hits.hits[0]._source;
      const checkGroup = topSource.monitor.check_group;

      const mlcg: MonitorLocCheckGroup = {
        monitorId,
        location,
        checkGroup,
        status: topSource.summary.down > 0 ? 'down' : 'up',
      };

      // This monitor doesn't match, so just skip ahead and don't add it to the output
      if (queryContext.statusFilter && queryContext.statusFilter !== mlcg.status) {
        continue MonitorLoop;
      }
      groups.push(mlcg);
    }
    matching.set(monitorId, groups);
  }

  return matching;
};

export const mostRecentCheckGroups = async (queryContext: QueryContext, monitorIds: string[]) => {
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      size: 0,
      query: {
        bool: {
          must: [
            {terms: { 'monitor.id': monitorIds }},
            // only match summary docs because we only want the latest *complete* check group.
            {exists: {field: 'summary.down'}}
          ]
        }
      },
      aggs: {
        monitor: {
          terms: { field: 'monitor.id', size: monitorIds.length },
          aggs: {
            location: {
              terms: { field: 'observer.geo.name', missing: 'N/A', size: 100 },
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
    },
  };

  return await queryContext.database.search(queryContext.request, params);
};
