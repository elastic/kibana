/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../../../authorization';
import type { RulesClientContext } from '../../../../rules_client';
import type { GetRuleIdsWithGapsParams, GetRuleIdsWithGapsResponse } from './types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { aggregatedGapStatus } from '../../../../../common/constants';
import {
  buildBaseGapsFilter,
  resolveTimeRange,
} from '../get_aggregated_gap_status_by_rule_ids/gap_intervals';
export const RULE_SAVED_OBJECT_TYPE = 'alert';

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

    const { start, end, statuses } = params;
    const eventLogClient = await context.getEventLogClient();

    const { from, to } = resolveTimeRange({ from: start, to: end });
    const filter = `${buildBaseGapsFilter(from, to)} AND kibana.alert.rule.gap.status: *`;

    const aggs = await eventLogClient.aggregateEventsWithAuthFilter(
      RULE_SAVED_OBJECT_TYPE,
      authorizationTuple.filter as KueryNode,
      {
        filter,
        aggs: {
          latest_gap_timestamp: { max: { field: '@timestamp' } },
          by_rule: {
            terms: { field: 'rule.id', size: 10000, order: { _key: 'asc' } },
            aggs: {
              sum_unfilled_ms: { sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' } },
              sum_in_progress_ms: {
                sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
              },
              sum_filled_ms: { sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' } },
            },
          },
        },
      }
    );

    interface ByRuleBucket {
      key: string;
      sum_unfilled_ms?: { value: number | null };
      sum_in_progress_ms?: { value: number | null };
      sum_filled_ms?: { value: number | null };
    }

    const byRuleAgg = aggs.aggregations?.by_rule as unknown as
      | { buckets: ByRuleBucket[] }
      | undefined;
    const buckets = byRuleAgg?.buckets ?? [];
    const categories = new Set(params.aggregatedStatuses);

    const ruleIds: string[] = [];
    for (const b of buckets) {
      const sumUnfilledMs = Math.max(0, b.sum_unfilled_ms?.value ?? 0);
      const sumInProgressMs = Math.max(0, b.sum_in_progress_ms?.value ?? 0);
      const sumFilledMs = Math.max(0, b.sum_filled_ms?.value ?? 0);
      // Precedence: IN_PROGRESS > UNFILLED > FILLED (match existing behavior)
      const status =
        sumInProgressMs > 0
          ? aggregatedGapStatus.IN_PROGRESS
          : sumUnfilledMs > 0
          ? aggregatedGapStatus.UNFILLED
          : sumFilledMs > 0
          ? aggregatedGapStatus.FILLED
          : null;
      if (status && categories.has(status)) {
        ruleIds.push(b.key);
      }
    }

    const latestGapTimestampAgg = aggs.aggregations?.latest_gap_timestamp as { value: number };
    const result: GetRuleIdsWithGapsResponse = {
      total: ruleIds.length,
      ruleIds,
      latestGapTimestamp: latestGapTimestampAgg?.value,
    };
    return result;
  } catch (err) {
    const errorMessage = `Failed to find rules with gaps`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
