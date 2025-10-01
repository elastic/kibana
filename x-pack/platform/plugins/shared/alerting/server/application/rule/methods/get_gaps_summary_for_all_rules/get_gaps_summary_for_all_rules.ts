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
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import {
  buildBaseGapsFilter,
  resolveTimeRange,
} from '../get_aggregated_gap_status_by_rule_ids/gap_helpers';
import type { GetGapsSummaryForAllRulesParams, GetGapsSummaryForAllRulesResponse } from './types';

export const RULE_SAVED_OBJECT_TYPE = 'alert';

export async function getGapsSummaryForAllRules(
  context: RulesClientContext,
  params: GetGapsSummaryForAllRulesParams
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
          totalUnfilledDurationMs: {
            sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
          },
          totalInProgressDurationMs: {
            sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
          },
          totalFilledDurationMs: {
            sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
          },
        },
      }
    );

    const totalUnfilled =
      (aggs.aggregations?.totalUnfilledDurationMs as { value: number })?.value ?? 0;
    const totalInProgress =
      (aggs.aggregations?.totalInProgressDurationMs as { value: number })?.value ?? 0;
    const totalFilled = (aggs.aggregations?.totalFilledDurationMs as { value: number })?.value ?? 0;
    const result: GetGapsSummaryForAllRulesResponse = {
      totalUnfilledDurationMs: totalUnfilled,
      totalInProgressDurationMs: totalInProgress,
      totalFilledDurationMs: totalFilled,
    };

    return result;
  } catch (err) {
    const errorMessage = `Failed to find gaps summary for all rules`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
