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
import {
  buildBaseGapsFilter,
  resolveTimeRange,
  extractGapDurationSums,
  calculateAggregatedGapStatus,
  COMMON_GAP_AGGREGATIONS,
  type GapDurationBucket,
} from './utils';
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

    const { start, end } = params;
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
            aggs: COMMON_GAP_AGGREGATIONS,
          },
        },
      }
    );

    interface ByRuleBucket extends GapDurationBucket {
      key: string;
    }

    const byRuleAgg = aggs.aggregations?.by_rule as unknown as
      | { buckets: ByRuleBucket[] }
      | undefined;
    const buckets = byRuleAgg?.buckets ?? [];
    const statuses = new Set(params.statuses);

    const ruleIds: string[] = [];
    for (const b of buckets) {
      const sums = extractGapDurationSums(b);
      const status = calculateAggregatedGapStatus(sums);
      if (status && statuses.has(status)) ruleIds.push(b.key);
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
