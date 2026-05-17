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
import type { Rule, RuleParams } from '../../application/rule/types';
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
export interface RuleChangeHistoryDocument<Params extends RuleParams = RuleParams>
  extends ChangeHistoryDocument {
  rule: Rule<Params>;
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

  const currentRule = await getRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    id: ruleId,
  });

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: currentRule.attributes.alertTypeId,
      consumer: currentRule.attributes.consumer,
      operation: ReadOperations.GetHistory,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_HISTORY,
        savedObject: {
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
          name: currentRule.attributes.name,
        },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_HISTORY,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: currentRule.attributes.name },
    })
  );

  const result = await context.changeTrackingService.getHistory(module, context.spaceId, ruleId, {
    from,
    size,
    sort,
  });

  const itemsRule: RuleChangeHistoryDocument[] = [];

  for (const item of result.items) {
    const ruleSnapshot = hydrateRuleSnapshot(item.object, context);

    if (ruleSnapshot) {
      itemsRule.push({ ...item, rule: ruleSnapshot });
    }
  }

  return {
    ...result,
    items: itemsRule,
  };
}

/**
 * Reconstructs the `SanitizedRule` for a single history entry from its
 * `object.snapshot` (a `RuleSnapshot` of `{ attributes: RawRule, references }`).
 * In particular it leads to transforming date strings to Date.
 *
 * If the snapshot is malformed or the rule type is no longer registered,
 * we fall back to the raw item — the caller may still surface it without a
 * fully-typed rule.
 */
function hydrateRuleSnapshot(
  obj: ChangeHistoryDocument['object'],
  context: RulesClientContext
): Rule | undefined {
  const snapshot = obj.snapshot;
  const rawRule = snapshot?.attributes;

  if (typeof rawRule !== 'object' || rawRule === null) {
    return;
  }

  const ruleTypeId =
    'alertTypeId' in rawRule && typeof rawRule.alertTypeId === 'string'
      ? rawRule.alertTypeId
      : undefined;

  if (!ruleTypeId) {
    return;
  }

  try {
    const ruleType = context.ruleTypeRegistry.get(ruleTypeId);
    const ruleDomain = transformRuleAttributesToRuleDomain(
      rawRule as RawRule,
      {
        id: obj.id,
        logger: context.logger,
        ruleType,
        references:
          snapshot?.references && Array.isArray(snapshot.references) ? snapshot.references : [],
      },
      context.isSystemAction
    );

    // `transformRuleDomainToRule` returns a `Rule` shape that omits the
    // raw `apiKey` field, so the result is effectively a `SanitizedRule`.
    return transformRuleDomainToRule(ruleDomain);
  } catch (error) {
    context.logger.warn(`Unable to hydrate rule snapshot for [${obj.id}]: ${error}`);

    return;
  }
}
