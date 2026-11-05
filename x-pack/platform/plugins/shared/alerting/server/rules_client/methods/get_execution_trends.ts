/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import type { IExecutionTrendsResult } from '../../../common';
import { AlertingAuthorizationEntity, AlertingAuthorizationFilterType } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import type { RulesClientContext } from '../types';
import { parseDate } from '../common';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import {
  formatExecutionTrendsResult,
  getExecutionTrendsAggregation,
} from '../../lib/get_execution_trends_aggregation';

export interface GetGlobalExecutionTrendsParams {
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  namespaces?: Array<string | undefined>;
}

export async function getGlobalExecutionTrendsWithAuth(
  context: RulesClientContext,
  { dateStart, dateEnd, filter, namespaces }: GetGlobalExecutionTrendsParams
): Promise<IExecutionTrendsResult> {
  context.logger.debug(`getGlobalExecutionTrendsWithAuth(): getting global execution trends`);

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
        namespaces,
      },
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_GLOBAL_EXECUTION_TRENDS,
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_GLOBAL_EXECUTION_TRENDS,
    })
  );

  const dateNow = new Date();
  const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
  const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

  const eventLogClient = await context.getEventLogClient();
  const { interval, aggs } = getExecutionTrendsAggregation({
    start: parsedDateStart,
    end: parsedDateEnd,
    filter,
  });

  try {
    const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
      RULE_SAVED_OBJECT_TYPE,
      authorizationTuple.filter as KueryNode,
      {
        start: parsedDateStart.toISOString(),
        end: parsedDateEnd.toISOString(),
        aggs,
      },
      namespaces
    );

    return formatExecutionTrendsResult(interval, aggResult);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getGlobalExecutionTrendsWithAuth(): error searching global execution trends: ${err.message}`
    );
    throw err;
  }
}
