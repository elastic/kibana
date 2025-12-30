/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawRuleTemplate } from '../../../types';

import type { RuleTemplate } from '../types';

export interface TransformRawRuleTemplateToRuleTemplateParams {
  attributes: RawRuleTemplate;
  id: string;
}
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
    ruleTypeId: attributes.ruleTypeId,
    schedule: attributes.schedule,
    tags: attributes.tags,
    alertDelay: attributes.alertDelay,
    flapping: attributes.flapping,
  };
};
