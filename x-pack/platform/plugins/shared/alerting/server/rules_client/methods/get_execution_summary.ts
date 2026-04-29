/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { AlertingAuthorizationEntity, AlertingAuthorizationFilterType } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import type { RulesClientContext } from '../types';
import { parseDate } from '../common';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import {
  formatExecutionSummaryResult,
  getExecutionSummaryAggregation,
} from '../../lib/get_execution_log_aggregation';

export interface GetGlobalExecutionSummaryParams {
  dateStart: string;
  dateEnd?: string;
}

export async function getGlobalExecutionSummaryWithAuth(
  context: RulesClientContext,
  { dateStart, dateEnd }: GetGlobalExecutionSummaryParams
) {
  context.logger.debug(`getGlobalExecutionSummaryWithAuth(): getting global execution summary`);

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter({
      authorizationEntity: AlertingAuthorizationEntity.Alert,
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
        action: RuleAuditAction.GET_GLOBAL_EXECUTION_SUMMARY,
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_GLOBAL_EXECUTION_SUMMARY,
    })
  );

  const dateNow = new Date();
  const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
  const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

  const eventLogClient = await context.getEventLogClient();

  try {
    const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
      RULE_SAVED_OBJECT_TYPE,
      authorizationTuple.filter as KueryNode,
      {
        start: parsedDateStart.toISOString(),
        end: parsedDateEnd.toISOString(),
        aggs: getExecutionSummaryAggregation(),
      }
    );

    return formatExecutionSummaryResult(aggResult);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getGlobalExecutionSummaryWithAuth(): error searching global execution summary: ${err.message}`
    );
    throw err;
  }
}
