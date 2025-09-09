/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { AlertingAuthorizationEntity, ReadOperations } from '../../../../authorization';
import { getRuleTemplateSo } from '../../../../data/rule_template';

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
    await context.authorization.ensureAuthorized({
      ruleTypeId: result.attributes.ruleTypeId,
      consumer: 'alerts',
      operation: ReadOperations.Get,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    throw error;
  }

  return transformRawRuleTemplateToRuleTemplate({
    id: result.id,
    attributes: result.attributes,
  });
}
