import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { LegacyMonitorStatesQueryResult } from './adapter_types';
import { QUERY, INDEX_NAMES } from '../../../../common/constants';
import { fetchMonitorLocCheckGroups } from './latest_check_group_fetcher';
import { get, flatten } from 'lodash';
import {
  MonitorSummary,
  SummaryHistogram,
  Check,
  StatesIndexStatus,
  CursorDirection,
  SortOrder,
  CursorPagination,
} from '../../../../common/graphql/types';

export type EnrichedQueryResult = {
  items: any[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
};

export const queryEnriched = async (queryContext: QueryContext): Promise<EnrichedQueryResult> => {
  const size = Math.min(queryContext.size, QUERY.DEFAULT_AGGS_CAP);
  const mlcgsResult = await fetchMonitorLocCheckGroups(queryContext, size);

  const checkGroups = flatten(mlcgsResult.items.map(mlcg => mlcg.groups.map(g => g.checkGroup)));

  // TODO the scripted metric query here is totally unnecessary and largely
  // redundant with the way the code works now. This could be simplified
  // to a much simpler query + some JS processing.
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      query: {
        bool: {
          filter: [
            { terms: { 'monitor.check_group': checkGroups } },
            // Even though this work is already done when calculating the groups
            // this helps the planner
            queryContext.filterClause,
          ],
        },
      },
      size: 0,
      aggs: {
        monitors: {
          composite: {
            /**
             * TODO: extract this to a constant; we can't be looking for _only_
             * ten monitors, because it's possible our check groups selection will represent more than ten.
             *
             * We were previously passing the after key from the check groups query regardless of the number of monitors we had,
             * it's important that the latest check group from the final monitor we use is what we return, or we will be way ahead in terms
             * of check groups and end up skipping monitors on subsequent calls.
             */
            size: 500,
            sources: [
              {
                monitor_id: {
                  terms: {
                    field: 'monitor.id',
                    order: cursorDirectionToOrder(queryContext.pagination.cursorDirection),
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

  const items = await queryContext.database.search(queryContext.request, params);
  const monitorBuckets = get(items, 'aggregations.monitors.buckets', []);

  return {
    items,
    nextPagePagination: mlcgsResult.nextPagePagination,
    prevPagePagination: mlcgsResult.prevPagePagination,
  };
};

const cursorDirectionToOrder = (cd: CursorDirection): 'asc' | 'desc' => {
  return CursorDirection[cd] === CursorDirection.AFTER ? 'asc' : 'desc';
};
