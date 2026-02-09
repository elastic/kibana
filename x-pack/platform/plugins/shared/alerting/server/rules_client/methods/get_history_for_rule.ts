/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import { AlertingAuthorizationEntity, ReadOperations } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { getRuleSo } from '../../data/rule';
import type { GetHistoryResult } from '../lib/change_tracking';
import type { RulesClientContext } from '../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export interface GetHistoryByParams {
  module: RuleTypeSolution;
  ruleId: string;
  dateStart?: string;
  dateEnd?: string;
  user?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
}

export async function getHistoryForRule(
  context: RulesClientContext,
  params: GetHistoryByParams
): Promise<GetHistoryResult> {
  context.logger.debug(`getHistoryForRule(): getting history log for rule ${params.ruleId}`);

  const { id, attributes } = await getRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    id: params.ruleId,
  });

  const ruleAuditEventData = {
    action: RuleAuditAction.GET_HISTORY,
    savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
  };

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: ReadOperations.GetHistory,
      entity: AlertingAuthorizationEntity.Rule,
    });
    context.auditLogger?.log(ruleAuditEvent(ruleAuditEventData));
  } catch (error) {
    context.auditLogger?.log(ruleAuditEvent({ ...ruleAuditEventData, error }));
    throw error;
  }

  if (context.changeTrackingService?.initialized(params.module)) {
    return await context.changeTrackingService.getHistory(params.module, params.ruleId);
  }
  return {
    total: 0,
    items: [],
  };
}
