/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkGapsFillStep } from './types';
import type { RulesClientContext } from '../../../../rules_client';
import type { RuleAuditEventParams } from '../../../../rules_client/common/audit_events';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

export type BulkGapFillError = ReturnType<typeof toBulkGapFillError>;

export const toBulkGapFillError = (
  rule: { id: string; name: string },
  step: BulkGapsFillStep,
  error: Error
) => {
  let fallbackMessage: string;
  switch (step) {
    case BulkGapsFillStep.SCHEDULING:
      fallbackMessage = 'Error scheduling backfills';
      break;
    case BulkGapsFillStep.ACCESS_VALIDATION:
      fallbackMessage = 'Error validating user access to the rule';
      break;
  }
  return {
    rule: {
      id: rule.id,
      name: rule.name,
    },
    step,
    errorMessage: error?.message ?? fallbackMessage,
  };
};

export const logProcessedAsAuditEvent = (
  context: RulesClientContext,
  { id, name }: { id: string; name: string },
  error?: Error
) => {
  const payload: RuleAuditEventParams = {
    action: RuleAuditAction.FILL_GAPS,
    savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
  };
  if (error) {
    payload.error = error;
  }
  context.auditLogger?.log(ruleAuditEvent(payload));
};
