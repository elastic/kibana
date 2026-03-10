/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { AlertingAuthorizationEntity, ReadOperations } from '../../../../authorization';
import { getRuleTemplateSo } from '../../../../data/rule_template';
import {
  RuleTemplateAuditAction,
  ruleTemplateAuditEvent,
} from '../../../../rules_client/common/audit_events';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

import type { RulesClientContext } from '../../../../rules_client/types';

import type { GetRuleTemplateParams } from './types';
import { getRuleTemplateParamsSchema } from './schema';
import { transformRawRuleTemplateToRuleTemplate } from '../../transforms/transform_raw_rule_template_to_rule_template';
import type { RuleTemplate } from '../../types';

export async function getRuleTemplate(
  context: RulesClientContext,
  params: GetRuleTemplateParams
): Promise<RuleTemplate> {
  try {
    getRuleTemplateParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating get data - ${error.message}`);
  }

  const { id } = params;

  const result = await getRuleTemplateSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    id,
  });

  try {
    await context.authorization.ensureAuthorizedByRuleType({
      ruleTypeId: result.attributes.ruleTypeId,
      operation: ReadOperations.Get,
      entity: AlertingAuthorizationEntity.Rule,
      consumerRequiredPrivilege: 'read',
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleTemplateAuditEvent({
        action: RuleTemplateAuditAction.GET,
        savedObject: {
          type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          id,
          name: result.attributes.name,
        },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleTemplateAuditEvent({
      action: RuleTemplateAuditAction.GET,
      savedObject: {
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        id,
        name: result.attributes.name,
      },
    })
  );

  return transformRawRuleTemplateToRuleTemplate({
    id: result.id,
    attributes: result.attributes,
  });
}
