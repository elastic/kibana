/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import type {
  AggregationsMaxAggregate,
  AggregationsAggregationContainer,
} from '@elastic/elasticsearch/lib/api/types';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../../../authorization';
import type { RulesClientContext } from '../../../../rules_client';
import type { GetRuleIdsWithGapsParams, GetRuleIdsWithGapsResponse } from './types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { hasMatchedGapFillStatus, RULE_GAP_AGGREGATIONS, type GapDurationBucket } from '../utils';
export const RULE_SAVED_OBJECT_TYPE = 'alert';
import { buildGapsFilter } from '../../../../lib/rule_gaps/build_gaps_filter';

/**
 * Returns rule ids that have gaps within the requested time range.
 *
 * Parameters:
 * - statuses: Direct per-gap status filter applied to event log gap documents
 *   before aggregation. This corresponds to gap-level statuses
 *   (e.g. 'unfilled' | 'partially_filled' | 'filled') and controls which
 *   gaps are considered in the aggregations and latest timestamp query.
 *
 * - highestPriorityGapFillStatuses: Computed, per-rule status filter applied after
 *   aggregation. For each rule we compute an aggregated status from the
 *   summed gap durations with precedence: unfilled > in_progress > filled.
 *   Only rules whose computed aggregated status matches one of the provided
 *   values ('unfilled' | 'in_progress' | 'filled') are returned.
 */
const MAX_RULES_TO_FETCH = 10000;
export async function getRuleIdsWithGaps(
  context: RulesClientContext,
  params: GetRuleIdsWithGapsParams
) {
  try {
    let authorizationTuple;
    try {
      authorizationTuple = await context.authorization.getFindAuthorizationFilter({
        authorizationEntity: AlertingAuthorizationEntity.Rule,
        filterOpts: {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'kibana.alert.rule.rule_type_id',
            consumer: 'kibana.alert.rule.consumer',
          },
        },
      });
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.GET_RULES_WITH_GAPS,
          error,
        })
      );
      throw error;
    }

    const {
      start,
      end,
      statuses,
      sortOrder,
      ruleTypes,
      ruleIds: ruleIdsFilter,
      highestPriorityGapFillStatuses = [],
    } = params;
    const eventLogClient = await context.getEventLogClient();

    let filter = buildGapsFilter({
      start,
      end,
      statuses,
      hasUnfilledIntervals: params.hasUnfilledIntervals,
      hasInProgressIntervals: params.hasInProgressIntervals,
      hasFilledIntervals: params.hasFilledIntervals,
    });

    if (ruleTypes?.length) {
      const ruleTypesFilter = ruleTypes
        .map(
          (ruleType) =>
            `(kibana.alert.rule.rule_type_id: "${ruleType.type}" AND kibana.alert.rule.consumer: "${ruleType.consumer}")`
        )
        .join(' OR ');
      filter = `${filter} AND (${ruleTypesFilter})`;
    }

    if (ruleIdsFilter?.length) {
      const ruleIdsFilterKql = [...new Set(ruleIdsFilter)]
        .map((ruleId) => `rule.id: "${ruleId}"`)
        .join(' OR ');
      filter = `${filter} AND (${ruleIdsFilterKql})`;
    }

    const perBucketAgg: Record<string, AggregationsAggregationContainer> =
      sortOrder === 'desc'
        ? { newest_gap_timestamp: { max: { field: '@timestamp' } } }
        : { oldest_gap_timestamp: { min: { field: '@timestamp' } } };

    const aggs = await eventLogClient.aggregateEventsWithAuthFilter(
      RULE_SAVED_OBJECT_TYPE,
      authorizationTuple.filter as KueryNode,
      {
        filter,
        aggs: {
          latest_gap_timestamp: {
            max: {
              field: '@timestamp',
            },
          },
          by_rule: {
            terms: {
              field: 'rule.id',
              size: params.maxRulesToFetch ?? MAX_RULES_TO_FETCH,
              order:
                sortOrder === 'desc'
                  ? { newest_gap_timestamp: 'desc' }
                  : { oldest_gap_timestamp: 'asc' },
            },
            aggs: {
              ...perBucketAgg,
              ...RULE_GAP_AGGREGATIONS,
            },
          },
        },
      }
    );

    const byRuleAgg = aggs.aggregations?.by_rule as { buckets: GapDurationBucket[] };
    const buckets = byRuleAgg?.buckets ?? [];

    const ruleIds: string[] = [];

    for (const b of buckets) {
      if (
        highestPriorityGapFillStatuses.length === 0 ||
        hasMatchedGapFillStatus(b, highestPriorityGapFillStatuses)
      ) {
        ruleIds.push(b.key);
      }
    }

    const latestGapTimestampAgg = aggs.aggregations
      ?.latest_gap_timestamp as AggregationsMaxAggregate;
    const result: GetRuleIdsWithGapsResponse = {
      total: ruleIds.length,
      ruleIds,
      latestGapTimestamp: latestGapTimestampAgg.value ?? undefined,
    };
    return result;
  } catch (err) {
    const errorMessage = `Failed to find rules with gaps`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
