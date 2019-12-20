/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_NAMES } from '../../../../../common/constants';
import { QueryContext } from './query_context';
import { CursorDirection } from '../../../../../common/graphql/types';
import { MonitorGroups, MonitorLocCheckGroup } from './fetch_page';
import { makeDateRangeFilter } from '../../../helper/make_date_rate_filter';

/**
 * Determines whether the provided check groups are the latest complete check groups for their associated monitor ID's.
 * If provided check groups are not the latest complete group, they are discarded.
 * @param queryContext the data and resources needed to perform the query
 * @param potentialMatchMonitorIDs the monitor ID's of interest
 * @param potentialMatchCheckGroups the check groups to filter for the latest match per ID
 */
// check groups for their associated monitor IDs. If not, it discards the result.
export const refinePotentialMatches = async (
  queryContext: QueryContext,
  potentialMatchMonitorIDs: string[],
  potentialMatchCheckGroups: Set<string>
): Promise<MonitorGroups[]> => {
  if (potentialMatchMonitorIDs.length === 0) {
    return [];
  }

  const recentGroupsMatchingStatus = await fullyMatchingIds(
    queryContext,
    potentialMatchMonitorIDs,
    potentialMatchCheckGroups
  );

  // Return the monitor groups filtering out potential matches that weren't current
  const matches: MonitorGroups[] = potentialMatchMonitorIDs
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
  potentialMatchMonitorIDs: string[],
  potentialMatchCheckGroups: Set<string>
) => {
  const mostRecentQueryResult = await mostRecentCheckGroups(queryContext, potentialMatchMonitorIDs);

  const matching = new Map<string, MonitorLocCheckGroup[]>();
  MonitorLoop: for (const monBucket of mostRecentQueryResult.aggregations.monitor.buckets) {
    const monitorId: string = monBucket.key;
    const groups: MonitorLocCheckGroup[] = [];

    for (const locBucket of monBucket.location.buckets) {
      const location = locBucket.key;
      const topSource = locBucket.top.hits.hits[0]._source;
      const checkGroup = topSource.monitor.check_group;
      const status = topSource.summary.down > 0 ? 'down' : 'up';

      // This monitor doesn't match, so just skip ahead and don't add it to the output
      if (queryContext.statusFilter && queryContext.statusFilter !== status) {
        continue MonitorLoop;
      }

      groups.push({
        monitorId,
        location,
        checkGroup,
        status,
        summaryTimestamp: topSource['@timestamp'],
      });
    }

    // We only truly match the monitor if one of the most recent check groups was found in the potential matches phase
    if (groups.some(g => potentialMatchCheckGroups.has(g.checkGroup))) {
      matching.set(monitorId, groups);
    }
  }

  return matching;
};

export const mostRecentCheckGroups = async (
  queryContext: QueryContext,
  potentialMatchMonitorIDs: string[]
): Promise<any> => {
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            makeDateRangeFilter(queryContext.dateRangeStart, queryContext.dateRangeEnd, true),
            { terms: { 'monitor.id': potentialMatchMonitorIDs } },
            // only match summary docs because we only want the latest *complete* check group.
            { exists: { field: 'summary' } },
          ],
        },
      },
      aggs: {
        monitor: {
          terms: { field: 'monitor.id', size: potentialMatchMonitorIDs.length },
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

  return await queryContext.search(params);
};
