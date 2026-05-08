/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import { AlertingAuthorizationEntity, ReadOperations } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RulesClientContext } from '../types';
import type { GetRuleHistoryResult } from '../lib/change_tracking';
import { getRuleSo } from '../../data/rule';

/**
 * Thrown by {@link RulesClient.getHistory} when rule change tracking is
 * disabled at the framework level (`xpack.alerting.ruleChangeTracking.enabled = false`).
 */
export class RuleChangeTrackingDisabledError extends Error {
  constructor(message = 'Rule change tracking is disabled.') {
    super(message);
    this.name = 'RuleChangeTrackingDisabledError';
  }
}

export interface GetRuleHistoryParams {
  /** Solution module that owns the rule (e.g. `'security'`). */
  module: RuleTypeSolution;
  /** Rule id to fetch history for. */
  ruleId: string;
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Page size. Defaults to 20. */
  perPage?: number;
  /** ES sort. Defaults to `[{ '@timestamp': { order: 'desc' } }]`. */
  sort?: SortCombinations[];
}

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

export async function getRuleHistory(
  context: RulesClientContext,
  { module, ruleId, page = DEFAULT_PAGE, perPage = DEFAULT_PER_PAGE, sort }: GetRuleHistoryParams
): Promise<GetRuleHistoryResult> {
  if (!context.changeTrackingService) {
    throw new RuleChangeTrackingDisabledError();
  }

  const rule = await getRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    id: ruleId,
  });

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: rule.attributes.alertTypeId,
      consumer: rule.attributes.consumer,
      operation: ReadOperations.GetHistory,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_HISTORY,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: rule.attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_HISTORY,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: rule.attributes.name },
    })
  );

  const from = (page - 1) * perPage;

  const result = await context.changeTrackingService.getHistory(module, context.spaceId, ruleId, {
    from,
    size: perPage,
    sort,
  });

  return result as GetRuleHistoryResult;
}
