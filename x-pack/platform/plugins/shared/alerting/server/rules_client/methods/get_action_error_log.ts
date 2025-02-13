/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SanitizedRuleWithLegacyId } from '../../types';
import { convertEsSortToEventLogSort } from '../../lib';
import {
  ReadOperations,
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { IExecutionErrorsResult } from '../../../common';
import { formatExecutionErrorsResult } from '../../lib/format_execution_log_errors';
import { parseDate } from '../common';
import { RulesClientContext } from '../types';
import { getRule } from '../../application/rule/methods/get/get_rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

const actionErrorLogDefaultFilter =
  'event.provider:actions AND ((event.action:execute AND (event.outcome:failure OR kibana.alerting.status:warning)) OR (event.action:execute-timeout))';

export interface GetActionErrorLogByIdParams {
  id: string;
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
  namespace?: string;
}

export async function getActionErrorLog(
  context: RulesClientContext,
  { id, dateStart, dateEnd, filter, page, perPage, sort }: GetActionErrorLogByIdParams
): Promise<IExecutionErrorsResult> {
  context.logger.debug(`getActionErrorLog(): getting action error logs for rule ${id}`);
  const rule = (await getRule(context, { id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: rule.alertTypeId,
      consumer: rule.consumer,
      operation: ReadOperations.GetActionErrorLog,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_ACTION_ERROR_LOG,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: rule.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_ACTION_ERROR_LOG,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: rule.name },
    })
  );

  // default duration of instance summary is 60 * rule interval
  const dateNow = new Date();
  const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
  const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

  const eventLogClient = await context.getEventLogClient();

  try {
    const errorResult = await eventLogClient.findEventsBySavedObjectIds(
      RULE_SAVED_OBJECT_TYPE,
      [id],
      {
        start: parsedDateStart.toISOString(),
        end: parsedDateEnd.toISOString(),
        page,
        per_page: perPage,
        filter: filter
          ? `(${actionErrorLogDefaultFilter}) AND (${filter})`
          : actionErrorLogDefaultFilter,
        sort: convertEsSortToEventLogSort(sort),
      },
      rule.legacyId !== null ? [rule.legacyId] : undefined
    );
    return formatExecutionErrorsResult(errorResult);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getActionErrorLog(): error searching event log for rule ${id}: ${err.message}`
    );
    throw err;
  }
}

export async function getActionErrorLogWithAuth(
  context: RulesClientContext,
  { id, dateStart, dateEnd, filter, page, perPage, sort, namespace }: GetActionErrorLogByIdParams
): Promise<IExecutionErrorsResult> {
  context.logger.debug(`getActionErrorLogWithAuth(): getting action error logs for rule ${id}`);

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
        action: RuleAuditAction.GET_ACTION_ERROR_LOG,
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_ACTION_ERROR_LOG,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );

  // default duration of instance summary is 60 * rule interval
  const dateNow = new Date();
  const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
  const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

  const eventLogClient = await context.getEventLogClient();

  try {
    const errorResult = await eventLogClient.findEventsWithAuthFilter(
      RULE_SAVED_OBJECT_TYPE,
      [id],
      authorizationTuple.filter as KueryNode,
      namespace,
      {
        start: parsedDateStart.toISOString(),
        end: parsedDateEnd.toISOString(),
        page,
        per_page: perPage,
        filter: filter
          ? `(${actionErrorLogDefaultFilter}) AND (${filter})`
          : actionErrorLogDefaultFilter,
        sort: convertEsSortToEventLogSort(sort),
      }
    );
    return formatExecutionErrorsResult(errorResult);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getActionErrorLog(): error searching event log for rule ${id}: ${err.message}`
    );
    throw err;
  }
}
