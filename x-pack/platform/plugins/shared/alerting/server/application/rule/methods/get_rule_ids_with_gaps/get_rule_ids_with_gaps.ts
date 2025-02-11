/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { KueryNode } from '@kbn/es-query';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../../../authorization';
import { RulesClientContext } from '../../../../rules_client';
import { GetRuleIdsWithGapsParams, GetRuleIdsWithGapsResponse } from './types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { buildGapsFilter } from '../../../../lib/rule_gaps/build_gaps_filter';
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

    const filter = buildGapsFilter({
      start,
      end,
      statuses,
    });

    const aggs = await eventLogClient.aggregateEventsWithAuthFilter(
      RULE_SAVED_OBJECT_TYPE,
      authorizationTuple.filter as KueryNode,
      {
        filter,
        aggs: {
          unique_rule_ids: {
            terms: {
              field: 'rule.id',
              size: 10000,
            },
          },
        },
      }
    );

    interface UniqueRuleIdsAgg {
      buckets: Array<{ key: string }>;
    }

    const uniqueRuleIdsAgg = aggs.aggregations?.unique_rule_ids as UniqueRuleIdsAgg;

    const resultBuckets = uniqueRuleIdsAgg?.buckets ?? [];

    const ruleIds = resultBuckets.map((bucket) => bucket.key) ?? [];

    const result: GetRuleIdsWithGapsResponse = {
      total: ruleIds?.length,
      ruleIds,
    };

    return result;
  } catch (err) {
    const errorMessage = `Failed to find rules with gaps`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
