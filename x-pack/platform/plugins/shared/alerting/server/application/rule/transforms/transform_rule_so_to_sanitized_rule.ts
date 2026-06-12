/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import type { getRuleSo } from '../../../data/rule';
import { formatLegacyActions } from '../../../rules_client/lib';
import type { RulesClientContext } from '../../../rules_client/types';
import type { Rule as DeprecatedRule, SanitizedRule } from '../../../types';
import { ruleDomainSchema } from '../schemas';
import { transformRuleAttributesToRuleDomain } from './transform_rule_attributes_to_rule_domain';
import { transformRuleDomainToRule } from './transform_rule_domain_to_rule';
import type { RuleParams } from '../types';

type RuleSo = Awaited<ReturnType<typeof getRuleSo>>;

export async function transformRuleSoToSanitizedRule<Params extends RuleParams = never>(
  context: RulesClientContext,
  ruleSo: RuleSo
) {
  const ruleType = context.ruleTypeRegistry.get(ruleSo.attributes.alertTypeId);

  const ruleDomain = transformRuleAttributesToRuleDomain<Params>(
    ruleSo.attributes,
    {
      id: ruleSo.id,
      logger: context.logger,
      ruleType,
      references: ruleSo.references,
    },
    context.isSystemAction
  );

  // Try to validate created rule, but don't throw.
  try {
    ruleDomainSchema.validate(ruleDomain);
  } catch (e) {
    context.logger.warn(`Error validating get rule domain object for id: ${ruleSo.id}, ${e}`);
  }

  const rule = transformRuleDomainToRule<Params>(ruleDomain);

  // format legacy actions for SIEM rules
  if (ruleSo.attributes.consumer === AlertConsumers.SIEM) {
    const [migratedRule] = await formatLegacyActions([rule as DeprecatedRule], {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
    });

    return migratedRule;
  }

  // TODO (http-versioning): Remove this cast, this enables us to move forward
  // without fixing all of other solution types
  return rule as SanitizedRule<Params>;
}
