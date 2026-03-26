/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsSingleMetricAggregateBase,
  AggregationsCardinalityAggregate,
  AggregationsTermsAggregateBase,
  AggregationsStringTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger, ISavedObjectsRepository } from '@kbn/core/server';

import type { MaintenanceWindowAttributes } from '@kbn/maintenance-windows-plugin/common';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/maintenance-windows-plugin/common';
import type { ConnectorsByConsumersBucket } from './group_connectors_by_consumers';
import { groupConnectorsByConsumers } from './group_connectors_by_consumers';
import { groupRulesByNotifyWhen } from './group_rules_by_notify_when';
import { groupRulesByStatus } from './group_rules_by_status';
import type { AlertingUsage } from '../types';
import { NUM_ALERTING_RULE_TYPES } from '../alerting_usage_collector';
import { parseSimpleRuleTypeBucket } from './parse_simple_rule_type_bucket';
import { groupRulesBySearchType } from './group_rules_by_search_type';
import { parseAndLogError } from './parse_and_log_error';

interface Opts {
  esClient: ElasticsearchClient;
  alertIndex: string;
  logger: Logger;
}

interface MWOpts {
  savedObjectsClient: ISavedObjectsRepository;
  logger: Logger;
  maxDocuments?: number;
}

type GetTotalCountsResults = Pick<
  AlertingUsage,
  | 'count_total'
  | 'count_by_type'
  | 'count_rules_by_execution_status'
  | 'count_rules_by_notify_when'
  | 'count_rules_with_tags'
  | 'count_rules_with_elasticagent_tag'
  | 'count_rules_with_elasticagent_tag_by_type'
  | 'count_rules_snoozed'
  | 'count_rules_snoozed_by_type'
  | 'count_rules_muted'
  | 'count_rules_muted_by_type'
  | 'count_rules_with_muted_alerts'
  | 'count_rules_with_linked_dashboards'
  | 'count_rules_with_investigation_guide'
  | 'count_rules_with_api_key_created_by_user'
  | 'count_connector_types_by_consumers'
  | 'throttle_time'
  | 'schedule_time'
  | 'throttle_time_number_s'
  | 'schedule_time_number_s'
  | 'connectors_per_alert'
> & { errorMessage?: string; hasErrors: boolean };

type GetMWTelemetryResults = Pick<
  AlertingUsage,
  'count_mw_total' | 'count_mw_with_repeat_toggle_on' | 'count_mw_with_filter_alert_toggle_on'
> & {
  errorMessage?: string;
  hasErrors: boolean;
};

interface GetTotalCountInUseResults {
  countTotal: number;
  countByType: Record<string, number>;
  countNamespaces: number;
  errorMessage?: string;
  hasErrors: boolean;
}

const TELEMETRY_MW_COUNT_LIMIT = 10000;

export async function getTotalCountAggregations({
  esClient,
  alertIndex,
  logger,
}: Opts): Promise<GetTotalCountsResults> {
  try {
    const query = {
      index: alertIndex,
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          // Aggregate over all rule saved objects
          filter: [{ term: { type: 'alert' } }],
        },
      },
      runtime_mappings: {
        rule_action_count: {
          type: 'long' as const,
          script: {
            source: `
                def alert = params._source['alert'];
                if (alert != null) {
                  def actions = alert.actions;
                  if (actions != null) {
                    emit(actions.length);
                  } else {
                    emit(0);
                  }
                }`,
          },
        },
        // Convert schedule interval duration string from rule saved object to interval in seconds
        rule_schedule_interval: {
          type: 'long' as const,
          script: {
            source: `
                int parsed = 0;
                if (doc['alert.schedule.interval'].size() > 0) {
                  def interval = doc['alert.schedule.interval'].value;

                  if (interval.length() > 1) {
                      // get last char
                      String timeChar = interval.substring(interval.length() - 1);
                      // remove last char
                      interval = interval.substring(0, interval.length() - 1);

                      if (interval.chars().allMatch(Character::isDigit)) {
                        // using of regex is not allowed in painless language
                        parsed = Integer.parseInt(interval);

                        if (timeChar.equals("s")) {
                          parsed = parsed;
                        } else if (timeChar.equals("m")) {
                          parsed = parsed * 60;
                        } else if (timeChar.equals("h")) {
                          parsed = parsed * 60 * 60;
                        } else if (timeChar.equals("d")) {
                          parsed = parsed * 24 * 60 * 60;
                        }
                        emit(parsed);
                      }
                  }
                }
                emit(parsed);
              `,
          },
        },
        // Convert throttle interval duration string from rule saved object to interval in seconds
        rule_throttle_interval: {
          type: 'long' as const,
          script: {
            source: `
                int parsed = 0;
                if (doc['alert.throttle'].size() > 0) {
                def throttle = doc['alert.throttle'].value;

                if (throttle.length() > 1) {
                    // get last char
                    String timeChar = throttle.substring(throttle.length() - 1);
                    // remove last char
                    throttle = throttle.substring(0, throttle.length() - 1);

                    if (throttle.chars().allMatch(Character::isDigit)) {
                      // using of regex is not allowed in painless language
                      parsed = Integer.parseInt(throttle);

                      if (timeChar.equals("s")) {
                        parsed = parsed;
                      } else if (timeChar.equals("m")) {
                        parsed = parsed * 60;
                      } else if (timeChar.equals("h")) {
                        parsed = parsed * 60 * 60;
                      } else if (timeChar.equals("d")) {
                        parsed = parsed * 24 * 60 * 60;
                      }
                      emit(parsed);
                    }
                }
              }
              emit(parsed);
              `,
          },
        },
        rule_with_tags: {
          type: 'long' as const,
          script: {
            source: `
               def rule = params._source['alert'];
                if (rule != null && rule.tags != null) {
                  if (rule.tags.size() > 0) {
                    emit(1);
                  } else {
                    emit(0);
                  }
                }`,
          },
        },
        rule_with_elasticagent_tag: {
          type: 'long' as const,
          script: {
            source: `
               def rule = params._source['alert'];
                if (rule != null && rule.tags != null) {
                  for (tag in rule.tags) {
                    if (tag == 'Elastic Agent') {
                      emit(1);
                      return;
                    }
                  }
                }
                emit(0);`,
          },
        },
        rule_snoozed: {
          type: 'long' as const,
          script: {
            source: `
                def rule = params._source['alert'];
                if (rule != null && rule.snoozeSchedule != null) {
                  if (rule.snoozeSchedule.size() > 0) {
                    emit(1);
                  } else {
                    emit(0);
                  }
                }`,
          },
        },
        rule_muted: {
          type: 'long' as const,
          script: {
            source: `
                if (doc['alert.muteAll'].value == true) {
                  emit(1);
                } else {
                  emit(0);
                }`,
          },
        },
        rule_with_muted_alerts: {
          type: 'long' as const,
          script: {
            source: `
                def rule = params._source['alert'];
                if (rule != null && rule.mutedInstanceIds != null) {
                  if (rule.mutedInstanceIds.size() > 0) {
                    emit(1);
                  } else {
                    emit(0);
                  }
                }`,
          },
        },
        rule_with_linked_dashboards: {
          type: 'long' as const,
          script: {
            source: `
               def rule = params._source['alert'];
                if (rule != null && rule.artifacts != null && rule.artifacts.dashboards != null) {
                  if (rule.artifacts.dashboards.size() > 0) {
                    emit(1);
                  } else {
                    emit(0);
                  }
                }`,
          },
        },
        rule_with_investigation_guide: {
          type: 'long' as const,
          script: {
            source: `
               def rule = params._source['alert'];
                if (rule != null && rule.artifacts != null && rule.artifacts.investigation_guide != null && rule.artifacts.investigation_guide.blob != null) {
                  if (rule.artifacts.investigation_guide.blob.trim() != '') {
                    emit(1);
                  } else {
                    emit(0);
                  }
                }`,
          },
        },
        rule_with_api_key_created_by_user: {
          type: 'long' as const,
          script: {
            source: `
                def rule = params._source['alert'];
                if (rule != null && rule.apiKeyCreatedByUser != null) {
                  if (rule.apiKeyCreatedByUser == true) {
                    emit(1);
                  } else {
                    emit(0);
                  }
                } else {
                  emit(0);
                }`,
          },
        },
      },
      aggs: {
        by_rule_type_id: {
          terms: {
            field: 'alert.alertTypeId',
            size: NUM_ALERTING_RULE_TYPES,
          },
        },
        max_throttle_time: { max: { field: 'rule_throttle_interval' } },
        min_throttle_time: { min: { field: 'rule_throttle_interval' } },
        avg_throttle_time: { avg: { field: 'rule_throttle_interval' } },
        max_interval_time: { max: { field: 'rule_schedule_interval' } },
        min_interval_time: { min: { field: 'rule_schedule_interval' } },
        avg_interval_time: { avg: { field: 'rule_schedule_interval' } },
        max_actions_count: { max: { field: 'rule_action_count' } },
        min_actions_count: { min: { field: 'rule_action_count' } },
        avg_actions_count: { avg: { field: 'rule_action_count' } },
        by_execution_status: {
          terms: {
            field: 'alert.executionStatus.status',
          },
        },
        by_notify_when: {
          terms: {
            field: 'alert.notifyWhen',
          },
        },
        connector_types_by_consumers: {
          terms: {
            field: 'alert.consumer',
          },
          aggs: {
            actions: {
              nested: {
                path: 'alert.actions',
              },
              aggs: {
                connector_types: {
                  terms: {
                    field: 'alert.actions.actionTypeId',
                  },
                },
              },
            },
          },
        },
        by_search_type: {
          terms: {
            field: 'alert.params.searchType',
          },
        },
        sum_rules_with_tags: { sum: { field: 'rule_with_tags' } },
        sum_rules_with_elasticagent_tag: { sum: { field: 'rule_with_elasticagent_tag' } },
        sum_rules_with_elasticagent_tag_by_type: {
          filter: {
            term: { rule_with_elasticagent_tag: 1 },
          },
          aggs: {
            by_alert_type: {
              terms: {
                field: 'alert.alertTypeId',
                size: NUM_ALERTING_RULE_TYPES,
              },
            },
          },
        },
        sum_rules_snoozed: { sum: { field: 'rule_snoozed' } },
        sum_rules_snoozed_by_type: {
          filter: {
            term: { rule_snoozed: 1 },
          },
          aggs: {
            by_alert_type: {
              terms: {
                field: 'alert.alertTypeId',
              },
            },
          },
        },
        sum_rules_muted: { sum: { field: 'rule_muted' } },
        sum_rules_muted_by_type: {
          filter: {
            term: { rule_muted: 1 },
          },
          aggs: {
            by_alert_type: {
              terms: {
                field: 'alert.alertTypeId',
              },
            },
          },
        },
        sum_rules_with_muted_alerts: { sum: { field: 'rule_with_muted_alerts' } },
        sum_rules_with_linked_dashboards: { sum: { field: 'rule_with_linked_dashboards' } },
        sum_rules_with_investigation_guide: { sum: { field: 'rule_with_investigation_guide' } },
        sum_rules_with_api_key_created_by_user: {
          sum: { field: 'rule_with_api_key_created_by_user' },
        },
      },
    };

    logger.debug(() => `query for getTotalCountAggregations - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);

    logger.debug(() => `results for getTotalCountAggregations query - ${JSON.stringify(results)}`);

    const aggregations = results.aggregations as {
      by_rule_type_id: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      max_throttle_time: AggregationsSingleMetricAggregateBase;
      min_throttle_time: AggregationsSingleMetricAggregateBase;
      avg_throttle_time: AggregationsSingleMetricAggregateBase;
      max_interval_time: AggregationsSingleMetricAggregateBase;
      min_interval_time: AggregationsSingleMetricAggregateBase;
      avg_interval_time: AggregationsSingleMetricAggregateBase;
      max_actions_count: AggregationsSingleMetricAggregateBase;
      min_actions_count: AggregationsSingleMetricAggregateBase;
      avg_actions_count: AggregationsSingleMetricAggregateBase;
      by_execution_status: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      by_notify_when: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      connector_types_by_consumers: AggregationsTermsAggregateBase<ConnectorsByConsumersBucket>;
      by_search_type: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      sum_rules_with_tags: AggregationsSingleMetricAggregateBase;
      sum_rules_with_elasticagent_tag: AggregationsSingleMetricAggregateBase;
      sum_rules_with_elasticagent_tag_by_type: {
        by_alert_type: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      };
      sum_rules_snoozed: AggregationsSingleMetricAggregateBase;
      sum_rules_snoozed_by_type: {
        by_alert_type: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      };
      sum_rules_muted: AggregationsSingleMetricAggregateBase;
      sum_rules_muted_by_type: {
        by_alert_type: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      };
      sum_rules_with_muted_alerts: AggregationsSingleMetricAggregateBase;
      sum_rules_with_linked_dashboards: AggregationsSingleMetricAggregateBase;
      sum_rules_with_investigation_guide: AggregationsSingleMetricAggregateBase;
      sum_rules_with_api_key_created_by_user: AggregationsSingleMetricAggregateBase;
    };

    const totalRulesCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const countRulesByExecutionStatus = groupRulesByStatus(
      parseSimpleRuleTypeBucket(aggregations.by_execution_status.buckets)
    );

    const countRulesByNotifyWhen = groupRulesByNotifyWhen(
      parseSimpleRuleTypeBucket(aggregations.by_notify_when.buckets)
    );

    const countConnectorTypesByConsumers = groupConnectorsByConsumers(
      aggregations.connector_types_by_consumers.buckets
    );

    const countRulesBySearchType = groupRulesBySearchType(
      parseSimpleRuleTypeBucket(aggregations.by_search_type.buckets)
    );

    return {
      hasErrors: false,
      count_total: totalRulesCount ?? 0,
      count_by_type: {
        ...parseSimpleRuleTypeBucket(aggregations.by_rule_type_id.buckets),
        ...countRulesBySearchType,
      },
      count_rules_by_execution_status: countRulesByExecutionStatus,
      count_rules_with_tags: aggregations.sum_rules_with_tags.value ?? 0,
      count_rules_with_elasticagent_tag: aggregations.sum_rules_with_elasticagent_tag.value ?? 0,
      count_rules_with_elasticagent_tag_by_type: {
        ...parseSimpleRuleTypeBucket(
          aggregations.sum_rules_with_elasticagent_tag_by_type.by_alert_type.buckets
        ),
      },
      count_rules_by_notify_when: countRulesByNotifyWhen,
      count_rules_snoozed: aggregations.sum_rules_snoozed.value ?? 0,
      count_rules_snoozed_by_type: {
        ...parseSimpleRuleTypeBucket(aggregations.sum_rules_snoozed_by_type.by_alert_type.buckets),
      },
      count_rules_muted_by_type: {
        ...parseSimpleRuleTypeBucket(aggregations.sum_rules_muted_by_type.by_alert_type.buckets),
      },
      count_rules_muted: aggregations.sum_rules_muted.value ?? 0,
      count_rules_with_muted_alerts: aggregations.sum_rules_with_muted_alerts.value ?? 0,
      count_rules_with_linked_dashboards: aggregations.sum_rules_with_linked_dashboards.value ?? 0,
      count_rules_with_investigation_guide:
        aggregations.sum_rules_with_investigation_guide.value ?? 0,
      count_rules_with_api_key_created_by_user:
        aggregations.sum_rules_with_api_key_created_by_user.value ?? 0,
      count_connector_types_by_consumers: countConnectorTypesByConsumers,
      throttle_time: {
        min: `${aggregations.min_throttle_time.value ?? 0}s`,
        avg: `${aggregations.avg_throttle_time.value ?? 0}s`,
        max: `${aggregations.max_throttle_time.value ?? 0}s`,
      },
      schedule_time: {
        min: `${aggregations.min_interval_time.value ?? 0}s`,
        avg: `${aggregations.avg_interval_time.value ?? 0}s`,
        max: `${aggregations.max_interval_time.value ?? 0}s`,
      },
      throttle_time_number_s: {
        min: aggregations.min_throttle_time.value ?? 0,
        avg: aggregations.avg_throttle_time.value ?? 0,
        max: aggregations.max_throttle_time.value ?? 0,
      },
      schedule_time_number_s: {
        min: aggregations.min_interval_time.value ?? 0,
        avg: aggregations.avg_interval_time.value ?? 0,
        max: aggregations.max_interval_time.value ?? 0,
      },
      connectors_per_alert: {
        min: aggregations.min_actions_count.value ?? 0,
        avg: aggregations.avg_actions_count.value ?? 0,
        max: aggregations.max_actions_count.value ?? 0,
      },
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getTotalCountAggregations`, logger);

    return {
      hasErrors: true,
      errorMessage,
      count_total: 0,
      count_by_type: {},
      count_rules_by_execution_status: { success: 0, error: 0, warning: 0 },
      count_rules_by_notify_when: {
        on_throttle_interval: 0,
        on_active_alert: 0,
        on_action_group_change: 0,
      },
      count_rules_with_tags: 0,
      count_rules_with_elasticagent_tag: 0,
      count_rules_with_elasticagent_tag_by_type: {},
      count_rules_snoozed: 0,
      count_rules_muted: 0,
      count_rules_with_muted_alerts: 0,
      count_rules_with_linked_dashboards: 0,
      count_rules_with_investigation_guide: 0,
      count_rules_with_api_key_created_by_user: 0,
      count_connector_types_by_consumers: {},
      count_rules_snoozed_by_type: {},
      count_rules_muted_by_type: {},
      throttle_time: {
        min: '0s',
        avg: '0s',
        max: '0s',
      },
      schedule_time: {
        min: '0s',
        avg: '0s',
        max: '0s',
      },
      throttle_time_number_s: {
        min: 0,
        avg: 0,
        max: 0,
      },
      schedule_time_number_s: {
        min: 0,
        avg: 0,
        max: 0,
      },
      connectors_per_alert: {
        min: 0,
        avg: 0,
        max: 0,
      },
    };
  }
}

export async function getTotalCountInUse({
  esClient,
  alertIndex,
  logger,
}: Opts): Promise<GetTotalCountInUseResults> {
  try {
    const query = {
      index: alertIndex,
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          // Aggregate over only enabled rule saved objects
          filter: [{ term: { type: 'alert' } }, { term: { 'alert.enabled': true } }],
        },
      },
      aggs: {
        namespaces_count: { cardinality: { field: 'namespaces' } },
        by_rule_type_id: {
          terms: {
            field: 'alert.alertTypeId',
            size: NUM_ALERTING_RULE_TYPES,
          },
        },
        by_search_type: {
          terms: {
            field: 'alert.params.searchType',
          },
        },
      },
    };

    logger.debug(() => `query for getTotalCountInUse - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);

    logger.debug(() => `results for getTotalCountInUse query - ${JSON.stringify(results)}`);

    const aggregations = results.aggregations as {
      by_rule_type_id: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      namespaces_count: AggregationsCardinalityAggregate;
      by_search_type: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
    };

    const totalEnabledRulesCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const countRulesBySearchType = groupRulesBySearchType(
      parseSimpleRuleTypeBucket(aggregations.by_search_type.buckets)
    );

    return {
      hasErrors: false,
      countTotal: totalEnabledRulesCount ?? 0,
      countByType: {
        ...parseSimpleRuleTypeBucket(aggregations.by_rule_type_id.buckets),
        ...countRulesBySearchType,
      },
      countNamespaces: aggregations.namespaces_count.value ?? 0,
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getTotalCountInUse`, logger);

    return {
      hasErrors: true,
      errorMessage,
      countTotal: 0,
      countByType: {},
      countNamespaces: 0,
    };
  }
}

export async function getMWTelemetry({
  savedObjectsClient,
  logger,
  maxDocuments = TELEMETRY_MW_COUNT_LIMIT,
}: MWOpts): Promise<GetMWTelemetryResults> {
  try {
    const mwFinder = savedObjectsClient.createPointInTimeFinder<MaintenanceWindowAttributes>({
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      namespaces: ['*'],
      perPage: 100,
      fields: ['rRule', 'scopedQuery'],
    });

    let countMWTotal = 0;
    let countMWWithRepeatToggleON = 0;
    let countMWWithFilterAlertToggleON = 0;
    mwLoop: for await (const response of mwFinder.find()) {
      for (const mwSavedObject of response.saved_objects) {
        if (countMWTotal > maxDocuments) break mwLoop;
        countMWTotal = countMWTotal + 1;
        // scopedQuery property will be null if "Filter alerts" toggle will be off
        if (mwSavedObject.attributes.scopedQuery) {
          countMWWithFilterAlertToggleON = countMWWithFilterAlertToggleON + 1;
        }
        // interval property will be not in place if "Repeat" toggle will be off
        if (Object.hasOwn(mwSavedObject.attributes.rRule, 'interval')) {
          countMWWithRepeatToggleON = countMWWithRepeatToggleON + 1;
        }
      }
    }
    await mwFinder.close();

    return {
      hasErrors: false,
      count_mw_total: countMWTotal,
      count_mw_with_repeat_toggle_on: countMWWithRepeatToggleON,
      count_mw_with_filter_alert_toggle_on: countMWWithFilterAlertToggleON,
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getTotalMWCount`, logger);

    return {
      hasErrors: true,
      errorMessage,
      count_mw_total: 0,
      count_mw_with_repeat_toggle_on: 0,
      count_mw_with_filter_alert_toggle_on: 0,
    };
  }
}
