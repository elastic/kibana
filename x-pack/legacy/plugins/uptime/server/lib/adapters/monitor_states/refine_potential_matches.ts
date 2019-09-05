/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { MonitorIdWithGroups } from './monitor_id_with_groups';
import { CursorDirection } from '../../../../common/graphql/types';
import { MonitorLocCheckGroup } from './monitor_loc_check_group';

export interface CheckGroupsPageResult {
  monitorIdGroups: MonitorIdWithGroups[];
  searchAfter: string;
}

export const refinePotentialMatches = async (
  queryContext: QueryContext,
  monitorIds: string[],
  filteredCheckGroups: Set<string>
): Promise<MonitorIdWithGroups[]> => {
  let matches: MonitorIdWithGroups[] = [];

  if (monitorIds.length === 0) {
    return matches;
  }

  const recentGroupsMatchingStatus = await fullyMatchingIds(
    queryContext,
    monitorIds,
    filteredCheckGroups
  );

  monitorIds.forEach((id: string) => {
    const mostRecentGroups = recentGroupsMatchingStatus.get(id);
    matches.push({
      id,
      matchesFilter: !!mostRecentGroups,
      groups: mostRecentGroups || [],
    });
  });
  matches = sortBy(matches, miwg => miwg.id);
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
        filterMatchesLatest: filteredCheckGroups.has(checkGroup),
        timestamp: topSource['@timestamp'],
        up: topSource.summary.up,
        down: topSource.summary.down,
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
        terms: { 'monitor.id': monitorIds },
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
