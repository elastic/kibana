/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleBackfillError } from '../../application/backfill/methods/schedule/types';
import type { RuleDomain } from '../../application/rule/types';
import type { RuleTypeRegistry } from '../../types';
import { createBackfillError } from './create_backfill_error';

interface GetBackfillRuleErrorOpts {
  rule: RuleDomain;
  ruleTypeRegistry: RuleTypeRegistry;
}

/** Returns the error for a rule that cannot be backfilled, or `undefined` if it can. */
export function getBackfillRuleError({
  rule,
  ruleTypeRegistry,
}: GetBackfillRuleErrorOpts): ScheduleBackfillError | undefined {
  const { id, name, enabled, alertTypeId, apiKey, uiamApiKey } = rule;

  if (!enabled) {
    return createBackfillError(`Rule ${id} is disabled`, id, name);
  }

  // check that the rule type is supported
  const isLifecycleRule = ruleTypeRegistry.get(alertTypeId).autoRecoverAlerts ?? true;
  if (isLifecycleRule) {
    return createBackfillError(
      `Rule type "${alertTypeId}" for rule ${id} is not supported`,
      id,
      name
    );
  }

  // check that the rule has a credential. A UIAM-only rule has no Elasticsearch key.
  if (!apiKey && !uiamApiKey) {
    return createBackfillError(`Rule ${id} has no API key`, id, name);
  }

  return undefined;
}
