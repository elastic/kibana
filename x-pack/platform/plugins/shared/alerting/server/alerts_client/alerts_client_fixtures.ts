/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetSummarizedAlertsParams,
  GetMaintenanceWindowScopedQueryAlertsParams,
  UpdateAlertsMaintenanceWindowIdByScopedQueryParams,
} from './types';
import type { MaintenanceWindow } from '../application/maintenance_window/types';
import { AlertRuleData } from '.';
import { AlertsFilter } from '../types';

export const alertRuleData: AlertRuleData = {
  consumer: 'bar',
  executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  id: '1',
  name: 'rule-name',
  parameters: {
    bar: true,
  },
  revision: 0,
  spaceId: 'default',
  tags: ['rule-', '-tags'],
  alertDelay: 0,
};

export const mockAAD = {
  _index: '.internal.alerts-observability.metrics.alerts-default-000001',
  _id: '2fdbcde9-49d1-4d50-b706-f800433ec08b',
  _score: 0,
  _source: {
    'kibana.alert.rule.category': 'Metric threshold',
    'kibana.alert.rule.consumer': 'alerts',
    'kibana.alert.rule.execution.uuid': '5c38913b-de21-4245-92b6-aa30b762a701',
    'kibana.alert.rule.name': 'test',
    'kibana.alert.rule.producer': 'infrastructure',
    'kibana.alert.rule.revision': 1,
    'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
    'kibana.alert.rule.uuid': 'd2aff310-18f3-11ee-adcf-e1a1d33129d2',
    'kibana.space_ids': ['default'],
    'kibana.alert.rule.tags': [],
    '@timestamp': '2023-07-02T16:17:45.925Z',
    'kibana.alert.reason': 'system.cpu.pct is 90% in the last 1 min for host-3. Alert when > 10%.',
    'kibana.alert.action_group': 'metrics.threshold.fired',
    'host.name': 'host-3',
    'host.cpu': {},
    'host.id': 'host-3',
    'kibana.alert.duration.us': 62984000,
    'kibana.alert.instance.id': 'host-3',
    'kibana.alert.start': '2023-07-02T16:16:42.941Z',
    'kibana.alert.uuid': '2fdbcde9-49d1-4d50-b706-f800433ec08b',
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'event.kind': 'signal',
    'event.action': 'active',
    'kibana.version': '8.10.0',
    'kibana.alert.flapping': false,
  },
};

const alertTypes = {
  new: 'open',
  ongoing: 'active',
  recovered: 'close',
};

export const getParamsByExecutionUuid: GetSummarizedAlertsParams = {
  ruleId: 'ruleId',
  spaceId: 'default',
  excludedAlertInstanceIds: [],
  executionUuid: '111',
};
export const getParamsByTimeQuery: GetSummarizedAlertsParams = {
  ruleId: 'ruleId',
  spaceId: 'default',
  excludedAlertInstanceIds: [],
  end: new Date('2023-09-06T00:01:00.000'),
  start: new Date('2023-09-06T00:00:00.000'),
};

export const getParamsByMaintenanceWindowScopedQuery: GetMaintenanceWindowScopedQueryAlertsParams =
  {
    ruleId: 'ruleId',
    spaceId: 'default',
    executionUuid: '111',
    maintenanceWindows: [
      {
        id: 'mw1',
        categoryIds: ['management'],
        scopedQuery: {
          kql: "kibana.alert.rule.name: 'test123'",
          filters: [],
          dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match_phrase":{"kibana.alert.rule.name":"test123"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
        },
      } as unknown as MaintenanceWindow,
      {
        id: 'mw2',
        categoryIds: ['management'],
        scopedQuery: {
          kql: "kibana.alert.rule.name: 'test456'",
          filters: [],
          dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match_phrase":{"kibana.alert.rule.name":"test456"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
        },
      } as unknown as MaintenanceWindow,
    ],
  };

export const getParamsByUpdateMaintenanceWindowIds: UpdateAlertsMaintenanceWindowIdByScopedQueryParams =
  getParamsByMaintenanceWindowScopedQuery;

export const getExpectedQueryByExecutionUuid = ({
  indexName,
  uuid = getParamsByExecutionUuid.executionUuid,
  ruleId = getParamsByExecutionUuid.ruleId,
  alertType,
  isLifecycleAlert = true,
  excludedAlertInstanceIds,
  alertsFilter,
}: {
  indexName: string;
  uuid?: string;
  ruleId?: string;
  alertType: keyof typeof alertTypes;
  isLifecycleAlert?: boolean;
  excludedAlertInstanceIds?: string[];
  alertsFilter?: AlertsFilter;
}) => ({
  body: {
    query: {
      bool: {
        filter: [
          { term: { 'kibana.alert.rule.execution.uuid': uuid } },
          { term: { 'kibana.alert.rule.uuid': ruleId } },
          {
            bool: { must_not: { exists: { field: 'kibana.alert.maintenance_window_ids' } } },
          },
          ...(isLifecycleAlert ? [{ term: { 'event.action': alertTypes[alertType] } }] : []),
          ...(!!excludedAlertInstanceIds?.length
            ? [
                {
                  bool: {
                    must_not: {
                      terms: {
                        'kibana.alert.instance.id': excludedAlertInstanceIds,
                      },
                    },
                  },
                },
              ]
            : []),
          ...(alertsFilter
            ? [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        match: {
                          [alertsFilter.query!.kql.split(':')[0]]:
                            alertsFilter.query!.kql.split(':')[1],
                        },
                      },
                    ],
                  },
                },
                {
                  script: {
                    script: {
                      params: {
                        datetimeField: '@timestamp',
                        days: alertsFilter.timeframe?.days,
                        timezone: alertsFilter.timeframe!.timezone,
                      },
                      source:
                        'params.days.contains(doc[params.datetimeField].value.withZoneSameInstant(ZoneId.of(params.timezone)).dayOfWeek.getValue())',
                    },
                  },
                },
                {
                  script: {
                    script: {
                      params: {
                        datetimeField: '@timestamp',
                        end: alertsFilter.timeframe!.hours.end,
                        start: alertsFilter.timeframe!.hours.start,
                        timezone: alertsFilter.timeframe!.timezone,
                      },
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
                    },
                  },
                },
              ]
            : []),
        ],
      },
    },
    size: 1000,
    track_total_hits: true,
  },
  ignore_unavailable: true,
  index: indexName,
});

export const getExpectedQueryByTimeRange = ({
  indexName,
  end = getParamsByTimeQuery.end.toISOString(),
  start = getParamsByTimeQuery.start.toISOString(),
  ruleId = getParamsByTimeQuery.ruleId,
  alertType,
  isLifecycleAlert = true,
  excludedAlertInstanceIds,
  alertsFilter,
}: {
  indexName: string;
  end?: string;
  start?: string;
  ruleId?: string;
  alertType: keyof typeof alertTypes;
  isLifecycleAlert?: boolean;
  excludedAlertInstanceIds?: string[];
  alertsFilter?: AlertsFilter;
}) => {
  const filter = [];
  filter.push(
    {
      range: {
        '@timestamp': {
          gte: start,
          lt: end,
        },
      },
    },
    { term: { 'kibana.alert.rule.uuid': ruleId } }
  );
  if (!!excludedAlertInstanceIds?.length) {
    filter.push({
      bool: {
        must_not: {
          terms: {
            'kibana.alert.instance.id': excludedAlertInstanceIds,
          },
        },
      },
    });
  }

  if (isLifecycleAlert) {
    if (alertType === 'recovered') {
      filter.push({
        range: {
          'kibana.alert.end': {
            gte: start,
            lt: end,
          },
        },
      });
    }
    if (alertType === 'new') {
      filter.push({
        range: {
          'kibana.alert.start': {
            gte: start,
          },
        },
      });
    }
    if (alertType === 'ongoing') {
      filter.push(
        {
          range: {
            'kibana.alert.start': {
              lt: start,
            },
          },
        },
        {
          bool: {
            must_not: {
              exists: {
                field: 'kibana.alert.end',
              },
            },
          },
        }
      );
    }
  }

  if (alertsFilter) {
    filter.push(
      {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              match: {
                [alertsFilter.query!.kql.split(':')[0]]: alertsFilter.query!.kql.split(':')[1],
              },
            },
          ],
        },
      },
      {
        script: {
          script: {
            params: {
              datetimeField: '@timestamp',
              days: alertsFilter.timeframe?.days,
              timezone: alertsFilter.timeframe!.timezone,
            },
            source:
              'params.days.contains(doc[params.datetimeField].value.withZoneSameInstant(ZoneId.of(params.timezone)).dayOfWeek.getValue())',
          },
        },
      },
      {
        script: {
          script: {
            params: {
              datetimeField: '@timestamp',
              end: alertsFilter.timeframe!.hours.end,
              start: alertsFilter.timeframe!.hours.start,
              timezone: alertsFilter.timeframe!.timezone,
            },
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
          },
        },
      }
    );
  }

  return {
    body: {
      query: {
        bool: {
          filter,
        },
      },
      size: 1000,
      track_total_hits: true,
    },
    ignore_unavailable: true,
    index: indexName,
  };
};
