/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, flatten, set, sortBy } from 'lodash';
import { DatabaseAdapter } from '../database';
import {
  UMMonitorStatesAdapter,
  MonitorStatesCheckGroupsResult,
  LegacyMonitorStatesQueryResult,
  GetMonitorStatesResult,
} from './adapter_types';
import {
  MonitorSummary,
  SummaryHistogram,
  Check,
  StatesIndexStatus,
  CursorDirection,
  SortOrder,
  CursorPagination,
} from '../../../../common/graphql/types';
import { INDEX_NAMES, STATES, QUERY } from '../../../../common/constants';
import { getHistogramInterval, getFilteredQueryAndStatusFilter } from '../../helper';

type SortChecks = (check: Check) => string[];
const checksSortBy = (check: Check) => [
  get<string>(check, 'observer.geo.name'),
  get<string>(check, 'monitor.ip'),
];

const DefaultCursorPagination: CursorPagination = {
  cursorDirection: CursorDirection.AFTER,
  sortOrder: SortOrder.DESC,
};

const cursorDirectionToOrder = (cd: CursorDirection): 'asc' | 'desc' => {
  return CursorDirection[cd] === CursorDirection.AFTER ? 'asc' : 'desc';
};

export class ElasticsearchMonitorStatesAdapter implements UMMonitorStatesAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  private checkGroupsBody(
    subQuery: any,
    size: number,
    searchAfter: any,
    pagination: CursorPagination
  ): any {
    const compositeOrder = cursorDirectionToOrder(pagination.cursorDirection);

    const body = {
      query: {
        bool: {
          filter: [
            {
              // We check for summary.up to ensure that the check group
              // is complete. Summary fields are only present on
              // completed check groups.
              exists: {
                field: 'summary.up',
              },
            },
            subQuery,
          ],
        },
      },
      size: 0,
      aggs: {
        monitors: {
          composite: {
            /**
             * The goal here is to fetch more than enough check groups to reach the target
             * amount in one query.
             *
             * For larger cardinalities, we can only count on being able to fetch max bucket
             * size, so we will have to run this query multiple times.
             *
             * Multiplying `size` by 2 assumes that there will be less than three locations
             * for the deployment, if needed the query will be run subsequently.
             */
            size: Math.min(size * 2, QUERY.DEFAULT_AGGS_CAP),
            sources: [
              {
                monitor_id: {
                  terms: {
                    field: 'monitor.id',
                    order: compositeOrder,
                  },
                },
              },
              {
                location: {
                  terms: {
                    field: 'observer.geo.name',
                    missing_bucket: true,
                    order: compositeOrder,
                  },
                },
              },
            ],
          },
          aggs: {
            top: {
              top_hits: {
                sort: [
                  {
                    '@timestamp': 'desc',
                  },
                ],
                _source: {
                  includes: ['monitor.check_group', '@timestamp'],
                },
                size: 1,
              },
            },
          },
        },
      },
    };

    if (searchAfter) {
      if (typeof searchAfter === 'string') {
        // This is usually passed through from the browser as string encoded JSON
        searchAfter = JSON.parse(searchAfter);
      }
      set(body, 'aggs.monitors.composite.after', searchAfter);
    }
    return body;
  }

  private async execCheckGroupsQuery(
    request: any,
    query: any,
    size: number,
    searchAfter: any,
    pagination: CursorPagination
  ) {
    const body = this.checkGroupsBody(query, size, searchAfter, pagination);

    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body,
    };

    return await this.database.search(request, params);
  }

  private searchSortAligned(pagination: CursorPagination): boolean {
    if (pagination.cursorDirection === CursorDirection.AFTER) {
      return pagination.sortOrder === SortOrder.ASC;
    } else {
      return pagination.sortOrder === SortOrder.DESC;
    }
  }

  private reorderResults<T>(results: T[], pagination: CursorPagination): T[] {
    if (this.searchSortAligned(pagination)) {
      return results;
    }

    results.reverse();
    return results;
  }

  // This query returns the most recent check groups for a given
  // monitor ID.
  private async queryCheckGroupsPage(
    request: any,
    query: any,
    searchAfter: any,
    pagination: CursorPagination,
    size: number = 10
  ): Promise<MonitorStatesCheckGroupsResult> {
    const checkGroupsById = new Map<string, string[]>();

    const result = await this.execCheckGroupsQuery(request, query, size, searchAfter, pagination);

    get<any>(result, 'aggregations.monitors.buckets', []).forEach((bucket: any) => {
      const id = get<string>(bucket, 'key.monitor_id');
      const checkGroup = get<string>(bucket, 'top.hits.hits[0]._source.monitor.check_group');
      const value = checkGroupsById.get(id);
      if (!value) {
        checkGroupsById.set(id, [checkGroup]);
      } else if (value.indexOf(checkGroup) < 0) {
        checkGroupsById.set(id, [...value, checkGroup]);
      }
    });

    return {
      checkGroups: this.reorderResults(flatten(Array.from(checkGroupsById.values())), pagination),
      searchAfter: result.aggregations.monitors.after_key,
    };
  }

  private async enrichAndCollapse(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination,
    filters?: string | null
  ) {
    const monitors: any[] = [];
    let searchAfter = pagination.cursorKey || null;
    do {
      const queryRes: LegacyMonitorStatesQueryResult = await this.enrichAndCollapsePage(
        request,
        dateRangeStart,
        dateRangeEnd,
        searchAfter,
        pagination,
        filters
      );
      const { result, statusFilter } = queryRes;
      searchAfter = queryRes.searchAfter;
      monitors.push(...this.getMonitorBuckets(result, statusFilter));
      if (get<number>(result, 'hits.total.value', 0) === 0) {
        break;
      }
    } while (searchAfter !== null && monitors.length < STATES.LEGACY_STATES_QUERY_SIZE);

    return monitors;
  }

  private async enrichAndCollapsePage(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    searchAfter: any,
    pagination: CursorPagination,
    filters?: string | null,
    size: number = 10
  ): Promise<LegacyMonitorStatesQueryResult> {
    size = Math.min(size, QUERY.DEFAULT_AGGS_CAP);
    const { query, statusFilter } = getFilteredQueryAndStatusFilter(
      dateRangeStart,
      dateRangeEnd,
      filters
    );

    // First we fetch the most recent check groups for this query
    // This is a critical performance optimization.
    // Without this the expensive scripted_metric agg below will run
    // over large numbers of documents.
    // It only really needs to run over the latest complete check group for each
    // agent.
    const checkGroupsRes = await this.queryCheckGroupsPage(
      request,
      query,
      searchAfter,
      pagination,
      size
    );

    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            filter: [
              { terms: { 'monitor.check_group': checkGroupsRes.checkGroups } },
              // Even though this work is already done when calculating the groups
              // this helps the planner
              query,
            ],
          },
        },
        size: 0,
        aggs: {
          monitors: {
            composite: {
              size,
              sources: [
                {
                  monitor_id: {
                    terms: {
                      field: 'monitor.id',
                      order: cursorDirectionToOrder(pagination.cursorDirection),
                    },
                  },
                },
              ],
            },
            aggregations: {
              state: {
                scripted_metric: {
                  init_script: `
                    // Globals are values that should be identical across all docs
                    // We can cheat a bit by always overwriting these and make the
                    // assumption that there is no variation in these across checks
                    state.globals = new HashMap();
                    // Here we store stuff broken out by agent.id and monitor.id
                    // This should correspond to a unique check.
                    state.checksByAgentIdIP = new HashMap();
                `,
                  map_script: `
                    Map curCheck = new HashMap();
                    String agentId = doc["agent.id"][0];
                    String ip = null;
                    if (doc["monitor.ip"].length > 0) {
                      ip = doc["monitor.ip"][0];
                    }
                    String agentIdIP = agentId + "-" + (ip == null ? "" : ip.toString());
                    def ts = doc["@timestamp"][0].toInstant().toEpochMilli();
                    
                    def lastCheck = state.checksByAgentIdIP[agentId];
                    Instant lastTs = lastCheck != null ? lastCheck["@timestamp"] : null;
                    if (lastTs != null && lastTs > ts) {
                      return;
                    }
                    
                    curCheck.put("@timestamp", ts);
                    
                    Map agent = new HashMap();
                    agent.id = agentId;
                    curCheck.put("agent", agent);
                    
                    if (state.globals.url == null) {
                      Map url = new HashMap();
                      Collection fields = ["full", "original", "scheme", "username", "password", "domain", "port", "path", "query", "fragment"];
                      for (field in fields) {
                        String docPath = "url." + field;
                        def val = doc[docPath];
                        if (!val.isEmpty()) {
                          url[field] = val[0];
                        }
                      }
                      state.globals.url = url;
                    }
                    
                    Map monitor = new HashMap();
                    monitor.status = doc["monitor.status"][0];
                    monitor.ip = ip;
                    if (!doc["monitor.name"].isEmpty()) {
                      String monitorName = doc["monitor.name"][0];
                      if (monitor.name != "") {
                        monitor.name = monitorName;
                      }
                    }
                    curCheck.monitor = monitor;
                    
                    if (curCheck.observer == null) {
                      curCheck.observer = new HashMap();
                    }
                    if (curCheck.observer.geo == null) {
                      curCheck.observer.geo = new HashMap();
                    }
                    if (!doc["observer.geo.name"].isEmpty()) {
                      curCheck.observer.geo.name = doc["observer.geo.name"][0];
                    }
                    if (!doc["observer.geo.location"].isEmpty()) {
                      curCheck.observer.geo.location = doc["observer.geo.location"][0];
                    }
                    if (!doc["kubernetes.pod.uid"].isEmpty() && curCheck.kubernetes == null) {
                      curCheck.kubernetes = new HashMap();
                      curCheck.kubernetes.pod = new HashMap();
                      curCheck.kubernetes.pod.uid = doc["kubernetes.pod.uid"][0];
                    }
                    if (!doc["container.id"].isEmpty() && curCheck.container == null) {
                      curCheck.container = new HashMap();
                      curCheck.container.id = doc["container.id"][0];
                    }
                    
                    state.checksByAgentIdIP[agentIdIP] = curCheck;
                `,
                  combine_script: 'return state;',
                  reduce_script: `
                  // The final document
                  Map result = new HashMap();
                  
                  Map checks = new HashMap();
                  Instant maxTs = Instant.ofEpochMilli(0);
                  Collection ips = new HashSet();
                  Collection geoNames = new HashSet();
                  Collection podUids = new HashSet();
                  Collection containerIds = new HashSet();
                  String name = null; 
                  for (state in states) {
                    result.putAll(state.globals);
                    for (entry in state.checksByAgentIdIP.entrySet()) {
                      def agentIdIP = entry.getKey();
                      def check = entry.getValue();
                      def lastBestCheck = checks.get(agentIdIP);
                      def checkTs = Instant.ofEpochMilli(check.get("@timestamp"));
                  
                      if (maxTs.isBefore(checkTs)) { maxTs = checkTs}
                  
                      if (lastBestCheck == null || lastBestCheck.get("@timestamp") < checkTs) {
                        check["@timestamp"] = check["@timestamp"];
                        checks[agentIdIP] = check
                      }

                      if (check.monitor.name != null && check.monitor.name != "") {
                        name = check.monitor.name;
                      }

                      ips.add(check.monitor.ip);
                      if (check.observer != null && check.observer.geo != null && check.observer.geo.name != null) {
                        geoNames.add(check.observer.geo.name);
                      }
                      if (check.kubernetes != null && check.kubernetes.pod != null) {
                        podUids.add(check.kubernetes.pod.uid);
                      }
                      if (check.container != null) {
                        containerIds.add(check.container.id);
                      }
                    }
                  }
                  
                  // We just use the values so we can store these as nested docs
                  result.checks = checks.values();
                  result.put("@timestamp", maxTs);
                  
                  
                  Map summary = new HashMap();
                  summary.up = checks.entrySet().stream().filter(c -> c.getValue().monitor.status == "up").count();
                  summary.down = checks.size() - summary.up;
                  result.summary = summary;
                  
                  Map monitor = new HashMap();
                  monitor.ip = ips;
                  monitor.name = name;
                  monitor.status = summary.down > 0 ? (summary.up > 0 ? "mixed": "down") : "up";
                  result.monitor = monitor;
                  
                  Map observer = new HashMap();
                  Map geo = new HashMap();
                  observer.geo = geo;
                  geo.name = geoNames;
                  result.observer = observer;
                  
                  if (!podUids.isEmpty()) {
                    result.kubernetes = new HashMap();
                    result.kubernetes.pod = new HashMap();
                    result.kubernetes.pod.uid = podUids;
                  }

                  if (!containerIds.isEmpty()) {
                    result.container = new HashMap();
                    result.container.id = containerIds;
                  }

                  return result;
                `,
                },
              },
            },
          },
        },
      },
    };

    const result = await this.database.search(request, params);

    return { result, statusFilter, searchAfter: checkGroupsRes.searchAfter };
  }

  private getMonitorBuckets(queryResult: any, statusFilter?: any) {
    let monitors = get(queryResult, 'aggregations.monitors.buckets', []);
    if (statusFilter) {
      monitors = monitors.filter(
        (monitor: any) => get(monitor, 'state.value.monitor.status') === statusFilter
      );
    }
    return monitors;
  }

  public async getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination = DefaultCursorPagination,
    filters?: string | null
  ): Promise<GetMonitorStatesResult> {
    const monitors = await this.enrichAndCollapse(
      request,
      dateRangeStart,
      dateRangeEnd,
      pagination,
      filters
    );

    if (monitors.length === 0) {
      return { summaries: [] };
    }

    const monitorIds: string[] = [];

    // Convert the results to MonitorSummary objects and also include the last location value found
    // this value will be used later for calculating the correct afterKey.
    type SummaryWithLastLocation = MonitorSummary & { lastLocation: string };

    const summaries: SummaryWithLastLocation[] = monitors.map((monitor: any) => {
      const monitorId = get<string>(monitor, 'key.monitor_id');
      monitorIds.push(monitorId);
      let state = get<any>(monitor, 'state.value');
      state = {
        ...state,
        timestamp: state['@timestamp'],
      };
      const { checks } = state;
      if (checks) {
        state.checks = sortBy<SortChecks, Check>(checks, checksSortBy);
        state.checks = state.checks.map((check: any) => ({
          ...check,
          timestamp: check['@timestamp'],
        }));
      } else {
        state.checks = [];
      }
      const lastCheck = state.checks[state.checks.length - 1];
      return {
        monitor_id: monitorId,
        lastLocation: get(lastCheck, 'observer.geo.name'),
        state,
      };
    });
    const histogramMap = await this.getHistogramForMonitors(
      request,
      dateRangeStart,
      dateRangeEnd,
      monitorIds
    );

    // If the sort order and the cursor direction are in opposition we must reverse the result order for it to appear correctly
    if (
      pagination.sortOrder === SortOrder.ASC
        ? pagination.cursorDirection === CursorDirection.BEFORE
        : pagination.cursorDirection === CursorDirection.AFTER
    ) {
      summaries.reverse();
    }

    return {
      summaries: summaries.map(summary => ({
        ...summary,
        histogram: histogramMap[summary.monitor_id],
      })),
    };
  }

  private async getHistogramForMonitors(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorIds: string[]
  ): Promise<{ [key: string]: SummaryHistogram }> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'monitor.id': monitorIds,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: dateRangeStart,
                    lte: dateRangeEnd,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          by_id: {
            terms: {
              field: 'monitor.id',
              size: STATES.LEGACY_STATES_QUERY_SIZE,
            },
            aggs: {
              histogram: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: getHistogramInterval(dateRangeStart, dateRangeEnd),
                  missing: 0,
                },
                aggs: {
                  status: {
                    terms: {
                      field: 'monitor.status',
                      size: 2,
                      shard_size: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = await this.database.search(request, params);

    const buckets: any[] = get(result, 'aggregations.by_id.buckets', []);
    return buckets.reduce((map: { [key: string]: any }, item: any) => {
      const points = get(item, 'histogram.buckets', []).map((histogram: any) => {
        const status = get(histogram, 'status.buckets', []).reduce(
          (statuses: { up: number; down: number }, bucket: any) => {
            if (bucket.key === 'up') {
              statuses.up = bucket.doc_count;
            } else if (bucket.key === 'down') {
              statuses.down = bucket.doc_count;
            }
            return statuses;
          },
          { up: 0, down: 0 }
        );
        return {
          timestamp: histogram.key,
          ...status,
        };
      });

      map[item.key] = {
        count: item.doc_count,
        points,
      };
      return map;
    }, {});
  }

  public async statesIndexExists(request: any): Promise<StatesIndexStatus> {
    // TODO: adapt this to the states index in future release
    const {
      _shards: { total },
      count,
    } = await this.database.count(request, { index: INDEX_NAMES.HEARTBEAT });
    return {
      indexExists: total > 0,
      docCount: {
        count,
      },
    };
  }
}
