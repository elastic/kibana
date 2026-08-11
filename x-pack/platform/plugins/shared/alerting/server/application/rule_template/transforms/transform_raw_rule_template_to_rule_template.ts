/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingV1RawRuleTemplate } from '../../../saved_objects/schemas/raw_rule_template';

import type { RuleTemplate } from '../types';

export interface TransformRawRuleTemplateToRuleTemplateParams {
  attributes: AlertingV1RawRuleTemplate;
  id: string;
}

/**
 * Maps Fleet-shaped / alerting v1 template SOs to the v1 application RuleTemplate.
 */
export const transformRawRuleTemplateToRuleTemplate = (
  params: TransformRawRuleTemplateToRuleTemplateParams
): RuleTemplate => {
  const { attributes, id } = params;

  return {
    id,
    name: attributes.name,
    params: attributes.params,
    description: attributes.description,
    artifacts: attributes.artifacts,
    engine: attributes.engine,
    ruleTypeId: attributes.ruleTypeId,
    schedule: attributes.schedule,
    tags: attributes.tags,
    alertDelay: attributes.alertDelay,
    flapping: attributes.flapping,
  };
};
