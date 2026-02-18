/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { ChangeHistoryDocument } from '@kbn/change-history';
import { transformRuleAttributesToRuleDomain } from '../../application/rule/transforms/transform_rule_attributes_to_rule_domain';
import { AlertingAuthorizationEntity, ReadOperations } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { getRuleSo } from '../../data/rule';
import type { RulesClientContext } from '../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type {
  GetRuleHistoryResult,
  RuleChangeHistoryDocument,
  RuleSnapshot,
} from '../lib/change_tracking';
import type { RawRule } from '../../types';

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
): Promise<GetRuleHistoryResult> {
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
    const history = await context.changeTrackingService.getHistory(params.module, params.ruleId);
    const result = {
      startDate: history.startDate,
      total: history.total,
      items: history.items.map(mapHistoryItem(context)),
    };
    return result;
  }
  return {
    total: 0,
    items: [],
  };
}

const mapHistoryItem =
  (context: RulesClientContext) =>
  (item: ChangeHistoryDocument): RuleChangeHistoryDocument => {
    const { attributes, references } = (item.object.snapshot ?? {}) as unknown as RuleSnapshot;

    const ruleDomain = transformRuleAttributesToRuleDomain(
      attributes as RawRule,
      {
        id: item.object.id,
        logger: context.logger,
        ruleType: context.ruleTypeRegistry.get(attributes.alertTypeId!),
        references,
      },
      context.isSystemAction
    );
    return { ruleDomain, ...item };
  };
