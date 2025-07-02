/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { AlertingAuthorizationEntity, ReadOperations } from '../../../../authorization';
import { getRuleSo } from '../../../../data/rule';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { SanitizedRule, SanitizedRuleWithLegacyId } from '../../../../types';
import type { RuleParams } from '../../types';
import { getRuleParamsSchema } from './schemas';
import type { GetRuleParams } from './types';
import { transformToSanitizedRule } from './utils';

export async function getRule<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: GetRuleParams
): Promise<SanitizedRule<Params> | SanitizedRuleWithLegacyId<Params>> {
  try {
    getRuleParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating get data - ${error.message}`);
  }

  const { id } = params;

  const result = await getRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    id,
  });

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: result.attributes.alertTypeId,
      consumer: result.attributes.consumer,
      operation: ReadOperations.Get,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: result.attributes.name },
        error,
      })
    );
    throw error;
  }
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: result.attributes.name },
    })
  );

  return transformToSanitizedRule(context, result, params);
}
