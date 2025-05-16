/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RulesClientContext } from '../../../../rules_client';
import type { BulkGapFillingErroredRule, BulkFillGapsByRuleIdsParams } from './types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';

export const validateRuleAccess = async (
  context: RulesClientContext,
  rules: BulkFillGapsByRuleIdsParams['rules']
) => {
  const errors: BulkGapFillingErroredRule[] = [];
  const validatedRules: BulkFillGapsByRuleIdsParams['rules'] = [];
  for (const rule of rules) {
    const { id, name, alertTypeId, consumer } = rule;
    try {
      // Make sure user has access to this rule
      await context.authorization.ensureAuthorized({
        ruleTypeId: alertTypeId,
        consumer,
        operation: WriteOperations.FillGaps,
        entity: AlertingAuthorizationEntity.Rule,
      });
      validatedRules.push(rule);
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FILL_GAPS,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
          error,
        })
      );
      errors.push({
        errorMessage: error?.message ?? 'Error validating user access to the rule',
        rule: {
          id,
          name,
        },
        step: 'ACCESS_VALIDATION',
      });
    }
  }

  return { validatedRules, errors };
};
