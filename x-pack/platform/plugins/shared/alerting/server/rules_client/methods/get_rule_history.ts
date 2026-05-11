/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { ChangeHistoryDocument, GetHistoryResult } from '@kbn/change-history';
import { AlertingAuthorizationEntity, ReadOperations } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RulesClientContext } from '../types';
import type { RawRule } from '../../types';
import {
  transformRuleAttributesToRuleDomain,
  transformRuleDomainToRule,
} from '../../application/rule/transforms';
import type { RuleSnapshot } from '../lib/change_tracking';
import type { Rule } from '../../application/rule/types';
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
  /** ES `from` offset. Defaults to 0. */
  from?: number;
  /** ES `size`. Defaults to 20. */
  size?: number;
  /** ES sort. When omitted, the underlying change-history client's default applies. */
  sort?: SortCombinations[];
}

/**
 * A single rule change-history document with the rule snapshot rehydrated
 * into a `SanitizedRule` shape so callers don't have to deal with the raw
 * stored `object.snapshot` directly.
 */
export interface RuleChangeHistoryDocument extends ChangeHistoryDocument {
  rule: Rule;
}

/**
 * Page of rule change-history documents returned by {@link RulesClient.getHistory}.
 */
export interface GetRuleHistoryResult extends GetHistoryResult {
  items: RuleChangeHistoryDocument[];
}

const DEFAULT_FROM = 0;
const DEFAULT_SIZE = 20;

export async function getRuleHistory(
  context: RulesClientContext,
  { module, ruleId, from = DEFAULT_FROM, size = DEFAULT_SIZE, sort }: GetRuleHistoryParams
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

  const result = await context.changeTrackingService.getHistory(module, context.spaceId, ruleId, {
    from,
    size,
    sort,
  });

  return {
    ...result,
    items: result.items.map((item) => hydrateRuleHistoryItem(item, context)),
  };
}

/**
 * Reconstruct the `SanitizedRule` for a single history entry from its
 * `object.snapshot` (a `RuleSnapshot` of `{ attributes: RawRule, references }`).
 * If the snapshot is malformed or the rule type is no longer registered,
 * we fall back to the raw item — the caller may still surface it without a
 * fully-typed rule.
 */
const hydrateRuleHistoryItem = (
  item: ChangeHistoryDocument,
  context: RulesClientContext
): RuleChangeHistoryDocument => {
  const snapshot = item.object?.snapshot as Partial<RuleSnapshot> | undefined;
  const rawRule = snapshot?.attributes;
  const ruleTypeId = rawRule?.alertTypeId;
  const ruleId = item.object?.id;

  if (!rawRule || !ruleTypeId || !ruleId) {
    return item as RuleChangeHistoryDocument;
  }

  try {
    const ruleType = context.ruleTypeRegistry.get(ruleTypeId);
    const ruleDomain = transformRuleAttributesToRuleDomain(
      rawRule as RawRule,
      {
        id: ruleId,
        logger: context.logger,
        ruleType,
        references: snapshot?.references ?? [],
      },
      context.isSystemAction
    );

    // `transformRuleDomainToRule` returns a `Rule` shape that omits the
    // raw `apiKey` field, so the result is effectively a `SanitizedRule`.
    return { ...item, rule: transformRuleDomainToRule(ruleDomain) };
  } catch (error) {
    context.logger.warn(`Unable to hydrate rule snapshot for [${ruleId}]: ${error}`);
    return item as RuleChangeHistoryDocument;
  }
};
