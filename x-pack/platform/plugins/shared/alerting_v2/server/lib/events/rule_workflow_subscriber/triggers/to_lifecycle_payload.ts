/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleLifecycleEvent } from '../../../../../common/workflows/triggers';
import type { RuleEvent } from '../../rule_event_publisher/events';

/**
 * Projects a rule-lifecycle domain event onto the workflow trigger payload.
 *
 * The bus event carries the full domain rule for change-history; workflows only
 * get identity fields plus tags so authors can match `event.rule.tags` without
 * a follow-up fetch. Tags default to `[]` when the domain rule is missing (the
 * bulk-delete fallback) and are copied into a fresh array so the workflow
 * payload does not alias saved-object state.
 */
export const toLifecycleWorkflowPayload = (event: RuleEvent): RuleLifecycleEvent => {
  const { ruleId, spaceId, rule } = event.payload;
  return {
    rule: {
      ruleId,
      spaceId,
      tags: [...(rule?.metadata.tags ?? [])],
    },
  };
};
