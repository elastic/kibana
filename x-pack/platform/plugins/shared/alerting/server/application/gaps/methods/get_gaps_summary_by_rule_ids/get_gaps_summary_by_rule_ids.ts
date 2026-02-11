/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import { AlertingAuthorizationEntity, ReadOperations } from '../../../../authorization';
import type { RuleBulkOperationAggregation, RulesClientContext } from '../../../../rules_client';
import type { GetGapsSummaryByRuleIdsParams, GetGapsSummaryByRuleIdsResponse } from './types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
export const RULE_SAVED_OBJECT_TYPE = 'alert';
import { convertRuleIdsToKueryNode } from '../../../../lib';
import { findRulesSo } from '../../../../data/rule';
import {
  alertingAuthorizationFilterOpts,
  RULE_TYPE_CHECKS_CONCURRENCY,
} from '../../../../rules_client/common/constants';
import {
  extractGapDurationSums,
  calculateHighestPriorityGapFillStatus,
  type GapDurationBucket,
  RULE_GAP_AGGREGATIONS,
} from '../utils';
import { buildGapsFilter } from '../../../../lib/rule_gaps/build_gaps_filter';

export async function getGapsSummaryByRuleIds(
  context: RulesClientContext,
  params: GetGapsSummaryByRuleIdsParams
) {
  try {
    let authorizationTuple;
    try {
      authorizationTuple = await context.authorization.getFindAuthorizationFilter({
        authorizationEntity: AlertingAuthorizationEntity.Rule,
        filterOpts: alertingAuthorizationFilterOpts,
      });
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.GET_GAPS_SUMMARY_BY_RULE_IDS,
          error,
        })
      );
      throw error;
    }

    const { start, end, ruleIds } = params;
    const { filter: authorizationFilter } = authorizationTuple;
    const kueryNodeFilter = convertRuleIdsToKueryNode(ruleIds);
    const kueryNodeFilterWithAuth =
      authorizationFilter && kueryNodeFilter
        ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
        : kueryNodeFilter;
    const eventLogClient = await context.getEventLogClient();

    const { aggregations } = await findRulesSo<RuleBulkOperationAggregation>({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      savedObjectsFindOptions: {
        filter: kueryNodeFilterWithAuth,
        page: 1,
        perPage: 0,
        ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
        aggs: {
          alertTypeId: {
            multi_terms: {
              terms: [
                { field: 'alert.attributes.alertTypeId' },
                { field: 'alert.attributes.consumer' },
              ],
            },
          },
        },
      },
    });

    const buckets = aggregations?.alertTypeId?.buckets;
    if (buckets === undefined || !buckets.length) {
      throw Boom.badRequest(`No rules matching ids ${ruleIds} found to get gaps summary`);
    }

    await pMap(
      buckets,
      async ({ key: [ruleType, consumer] }) => {
        try {
          await context.authorization.ensureAuthorized({
            ruleTypeId: ruleType,
            consumer,
            operation: ReadOperations.FindGaps,
            entity: AlertingAuthorizationEntity.Rule,
          });
        } catch (error) {
          context.auditLogger?.log(
            ruleAuditEvent({
              action: RuleAuditAction.GET_GAPS_SUMMARY_BY_RULE_IDS,
              error,
            })
          );
          throw error;
        }
      },
      { concurrency: RULE_TYPE_CHECKS_CONCURRENCY }
    );

    const filter = buildGapsFilter({
      start,
      end,
    });

    const aggs = await eventLogClient.aggregateEventsBySavedObjectIds(
      RULE_SAVED_OBJECT_TYPE,
      ruleIds,
      {
        filter,
        aggs: {
          unique_rule_ids: {
            terms: {
              field: 'rule.id',
              size: 10000,
            },
            aggs: {
              ...RULE_GAP_AGGREGATIONS,
            },
          },
        },
      }
    );

    interface UniqueRuleIdsAgg {
      buckets: Array<GapDurationBucket>;
    }

    const uniqueRuleIdsAgg = aggs.aggregations?.unique_rule_ids as UniqueRuleIdsAgg;
    const resultBuckets = uniqueRuleIdsAgg?.buckets ?? [];

    const result: GetGapsSummaryByRuleIdsResponse = {
      data: resultBuckets.map((bucket) => {
        const sums = extractGapDurationSums(bucket);
        const gapFillStatus = calculateHighestPriorityGapFillStatus(sums);
        return {
          ruleId: bucket.key,
          totalUnfilledDurationMs: sums.totalUnfilledDurationMs,
          totalInProgressDurationMs: sums.totalInProgressDurationMs,
          totalFilledDurationMs: sums.totalFilledDurationMs,
          ...(gapFillStatus ? { gapFillStatus } : {}),
        };
      }),
    };

    return result;
  } catch (err) {
    const errorMessage = `Failed to find gaps summary for rules`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
