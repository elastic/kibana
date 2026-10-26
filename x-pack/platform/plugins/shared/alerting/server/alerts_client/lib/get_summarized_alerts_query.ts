/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SearchRequest,
  SearchTotalHits,
  MsearchRequestItem,
} from '@elastic/elasticsearch/lib/api/types';
import type { BoolQuery } from '@kbn/es-query';
import {
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_DELAYED,
  ALERT_UUID,
  EVENT_ACTION,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { AlertsFilter, RuleAlertData } from '../../../common';
import { ISO_WEEKDAYS } from '../../../common';
import type {
  GetLifecycleAlertsQueryByExecutionUuidParams,
  GetLifecycleAlertsQueryByTimeRangeParams,
  GetAlertsQueryParams,
  GetQueryByExecutionUuidParams,
  GetQueryByTimeRangeParams,
  GetQueryByScopedQueriesParams,
  GetMaintenanceWindowAlertsQueryParams,
  SearchResult,
} from '../types';
import type { SummarizedAlertsChunk } from '../..';
import type { FormatAlert } from '../../types';
import { expandFlattenedAlert } from './format_alert';
import { injectAnalyzeWildcard } from './inject_analyze_wildcard';

enum AlertTypes {
  NEW = 0,
  ONGOING,
  RECOVERED,
}

export const RUNTIME_MAINTENANCE_WINDOW_ID_FIELD = 'runtime_maintenance_window_id';

const getLifecycleAlertsQueryByExecutionUuid = ({
  executionUuid,
  ruleId,
  excludedAlertInstanceIds,
  alertsFilter,
  maxAlertLimit,
}: GetLifecycleAlertsQueryByExecutionUuidParams): SearchRequest[] => {
  // lifecycle alerts assign a different action to an alert depending
  // on whether it is new/ongoing/recovered. query for each action in order
  // to get the count of each action type as well as up to the maximum number
  // of each type of alert.
  return [
    getQueryByExecutionUuid({
      executionUuid,
      ruleId,
      excludedAlertInstanceIds,
      action: 'open',
      alertsFilter,
      maxAlertLimit,
    }),
    getQueryByExecutionUuid({
      executionUuid,
      ruleId,
      excludedAlertInstanceIds,
      action: 'active',
      alertsFilter,
      maxAlertLimit,
    }),
    getQueryByExecutionUuid({
      executionUuid,
      ruleId,
      excludedAlertInstanceIds,
      action: 'close',
      alertsFilter,
      maxAlertLimit,
    }),
  ];
};

const getLifecycleAlertsQueryByTimeRange = ({
  start,
  end,
  ruleId,
  excludedAlertInstanceIds,
  alertsFilter,
  maxAlertLimit,
}: GetLifecycleAlertsQueryByTimeRangeParams): SearchRequest[] => {
  return [
    getQueryByTimeRange({
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      type: AlertTypes.NEW,
      alertsFilter,
      maxAlertLimit,
    }),
    getQueryByTimeRange({
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      type: AlertTypes.ONGOING,
      alertsFilter,
      maxAlertLimit,
    }),
    getQueryByTimeRange({
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      type: AlertTypes.RECOVERED,
      alertsFilter,
      maxAlertLimit,
    }),
  ];
};

const getQueryByExecutionUuid = ({
  executionUuid,
  ruleId,
  excludedAlertInstanceIds,
  action,
  alertsFilter,
  maxAlertLimit,
}: GetQueryByExecutionUuidParams): SearchRequest => {
  const filter: QueryDslQueryContainer[] = [
    {
      term: {
        [ALERT_RULE_EXECUTION_UUID]: executionUuid,
      },
    },
    {
      term: {
        [ALERT_RULE_UUID]: ruleId,
      },
    },
    {
      bool: {
        must_not: [
          {
            exists: {
              field: ALERT_MAINTENANCE_WINDOW_IDS,
            },
          },
          {
            term: {
              [ALERT_STATUS]: ALERT_STATUS_DELAYED,
            },
          },
        ],
      },
    },
  ];
  if (action) {
    filter.push({
      term: {
        [EVENT_ACTION]: action,
      },
    });
  }
  if (excludedAlertInstanceIds.length) {
    filter.push({
      bool: {
        must_not: {
          terms: {
            [ALERT_INSTANCE_ID]: excludedAlertInstanceIds,
          },
        },
      },
    });
  }

  if (alertsFilter) {
    filter.push(...generateAlertsFilterDSL(alertsFilter));
  }

  return {
    size: maxAlertLimit,
    track_total_hits: true,
    query: {
      bool: {
        filter,
      },
    },
  };
};

const getQueryByTimeRange = ({
  start,
  end,
  ruleId,
  excludedAlertInstanceIds,
  type,
  alertsFilter,
  maxAlertLimit,
}: GetQueryByTimeRangeParams<AlertTypes>): SearchRequest => {
  // base query filters the alert documents for a rule by the given time range
  let filter: QueryDslQueryContainer[] = [
    {
      range: {
        [TIMESTAMP]: {
          gte: start.toISOString(),
          lt: end.toISOString(),
        },
      },
    },
    {
      term: {
        [ALERT_RULE_UUID]: ruleId,
      },
    },
    {
      bool: {
        must_not: {
          term: {
            [ALERT_STATUS]: ALERT_STATUS_DELAYED,
          },
        },
      },
    },
  ];

  if (excludedAlertInstanceIds.length) {
    filter.push({
      bool: {
        must_not: {
          terms: {
            [ALERT_INSTANCE_ID]: excludedAlertInstanceIds,
          },
        },
      },
    });
  }

  if (type === AlertTypes.NEW) {
    // alerts are considered NEW within the time range if they started after
    // the query start time
    filter.push({
      range: {
        [ALERT_START]: {
          gte: start.toISOString(),
        },
      },
    });
  } else if (type === AlertTypes.ONGOING) {
    // alerts are considered ONGOING within the time range if they started
    // before the query start time and they have not been recovered (no end time)
    filter = [
      ...filter,
      {
        range: {
          [ALERT_START]: {
            lt: start.toISOString(),
          },
        },
      },
      {
        bool: {
          must_not: {
            exists: {
              field: ALERT_END,
            },
          },
        },
      },
    ];
  } else if (type === AlertTypes.RECOVERED) {
    // alerts are considered RECOVERED within the time range if they recovered
    // within the query time range
    filter.push({
      range: {
        [ALERT_END]: {
          gte: start.toISOString(),
          lt: end.toISOString(),
        },
      },
    });
  }

  if (alertsFilter) {
    filter.push(...generateAlertsFilterDSL(alertsFilter));
  }

  return {
    size: maxAlertLimit,
    track_total_hits: true,
    query: {
      bool: {
        filter,
      },
    },
  };
};

export const getQueryByScopedQueries = ({
  executionUuid,
  ruleId,
  action,
  maintenanceWindows,
  maxAlertLimit,
}: GetQueryByScopedQueriesParams): MsearchRequestItem[] => {
  const filters: QueryDslQueryContainer[] = [
    {
      term: {
        [ALERT_RULE_EXECUTION_UUID]: executionUuid,
      },
    },
    {
      term: {
        [ALERT_RULE_UUID]: ruleId,
      },
    },
    {
      bool: {
        must_not: {
          term: {
            [ALERT_STATUS]: ALERT_STATUS_DELAYED,
          },
        },
      },
    },
  ];

  if (action) {
    filters.push({
      term: {
        [EVENT_ACTION]: action,
      },
    });
  }

  const searches: MsearchRequestItem[] = [];

  maintenanceWindows.forEach(({ id, scope }) => {
    if (!scope?.alerting) {
      return;
    }

    const scopedQueryFilter = generateAlertsFilterDSL(
      {
        query: scope.alerting as AlertsFilter['query'],
      },
      {
        analyzeWildcard: true,
      }
    )[0] as { bool: BoolQuery };

    searches.push({});
    searches.push({
      query: {
        bool: {
          ...scopedQueryFilter.bool,
          filter: [...(scopedQueryFilter.bool?.filter || []), ...filters],
        },
      },
      runtime_mappings: {
        [RUNTIME_MAINTENANCE_WINDOW_ID_FIELD]: {
          script: {
            source: `emit('${id}');`,
          },
          type: 'keyword',
        },
      },
      fields: [ALERT_UUID, RUNTIME_MAINTENANCE_WINDOW_ID_FIELD],
      _source: false,
      size: maxAlertLimit,
      track_total_hits: true,
    });
  });

  return searches;
};

const generateAlertsFilterDSL = (
  alertsFilter: AlertsFilter,
  options?: { analyzeWildcard?: boolean }
): QueryDslQueryContainer[] => {
  const filter: QueryDslQueryContainer[] = [];
  const { analyzeWildcard = false } = options || {};

  if (alertsFilter.query) {
    const parsedQuery = JSON.parse(alertsFilter.query.dsl!);
    if (analyzeWildcard) {
      injectAnalyzeWildcard(parsedQuery);
    }
    filter.push(parsedQuery);
  }
  if (alertsFilter.timeframe) {
    filter.push(
      {
        script: {
          script: {
            source:
              'params.days.contains(doc[params.datetimeField].value.withZoneSameInstant(ZoneId.of(params.timezone)).dayOfWeek.getValue())',
            params: {
              days:
                alertsFilter.timeframe.days.length === 0
                  ? ISO_WEEKDAYS
                  : alertsFilter.timeframe.days,
              timezone: alertsFilter.timeframe.timezone,
              datetimeField: TIMESTAMP,
            },
          },
        },
      },
      {
        script: {
          script: {
            source: `
              def alertsDateTime = doc[params.datetimeField].value.withZoneSameInstant(ZoneId.of(params.timezone));
              def alertsTime = LocalTime.of(alertsDateTime.getHour(), alertsDateTime.getMinute());
              def start = LocalTime.parse(params.start);
              def end = LocalTime.parse(params.end);

              if (end.isBefore(start) || end.equals(start)){ // overnight
                def dayEnd = LocalTime.parse("23:59:59");
                def dayStart = LocalTime.parse("00:00:00");
                if ((alertsTime.isAfter(start) && alertsTime.isBefore(dayEnd)) || (alertsTime.isAfter(dayStart) && alertsTime.isBefore(end))) {
                  return true;
                } else {
                  return false;
                }
              } else {
                if (alertsTime.isAfter(start) && alertsTime.isBefore(end)) {
                    return true;
                } else {
                    return false;
                }
              }
           `,
            params: {
              start: alertsFilter.timeframe.hours.start,
              end: alertsFilter.timeframe.hours.end,
              timezone: alertsFilter.timeframe.timezone,
              datetimeField: TIMESTAMP,
            },
          },
        },
      }
    );
  }
  return filter;
};

const getHitsWithCount = <AlertData extends RuleAlertData>(
  response: SearchResult<AlertData>,
  formatAlert?: FormatAlert<AlertData>
): SummarizedAlertsChunk => {
  return {
    count: (response.total as SearchTotalHits).value,
    data: response.hits.map((hit) => {
      const { _id, _index, _source } = hit;

      const formattedSource = formatAlert && _source ? formatAlert(_source) : _source;

      const expandedSource = expandFlattenedAlert(formattedSource as object) as Alert & AlertData;
      return {
        _id: _id!,
        _index,
        ...expandedSource,
      };
    }),
  };
};

const getLifecycleAlertsQueries = ({
  executionUuid,
  start,
  end,
  ruleId,
  excludedAlertInstanceIds,
  alertsFilter,
  maxAlertLimit,
}: GetAlertsQueryParams): SearchRequest[] => {
  let queryBodies;
  if (executionUuid) {
    queryBodies = getLifecycleAlertsQueryByExecutionUuid({
      executionUuid: executionUuid!,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
      maxAlertLimit,
    });
  } else {
    queryBodies = getLifecycleAlertsQueryByTimeRange({
      start: start!,
      end: end!,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
      maxAlertLimit,
    });
  }

  return queryBodies;
};

const getContinualAlertsQuery = ({
  executionUuid,
  start,
  end,
  ruleId,
  excludedAlertInstanceIds,
  alertsFilter,
  maxAlertLimit,
}: GetAlertsQueryParams): SearchRequest => {
  let queryBody;
  if (executionUuid) {
    queryBody = getQueryByExecutionUuid({
      executionUuid,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
      maxAlertLimit,
    });
  } else {
    queryBody = getQueryByTimeRange({
      start: start!,
      end: end!,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
      maxAlertLimit,
    });
  }

  return queryBody;
};

const getMaintenanceWindowAlertsQuery = ({
  executionUuid,
  ruleId,
  action,
  maintenanceWindows,
  maxAlertLimit,
}: GetMaintenanceWindowAlertsQueryParams): MsearchRequestItem[] => {
  return getQueryByScopedQueries({
    executionUuid,
    ruleId,
    action,
    maintenanceWindows,
    maxAlertLimit,
  });
};

export {
  getHitsWithCount,
  getLifecycleAlertsQueries,
  getContinualAlertsQuery,
  getMaintenanceWindowAlertsQuery,
};
