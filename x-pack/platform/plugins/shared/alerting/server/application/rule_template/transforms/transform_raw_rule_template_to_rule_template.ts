/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RawRuleTemplate,
  AlertingV2RawRuleTemplate,
} from '../../../saved_objects/schemas/raw_rule_template';

import type { RuleTemplate } from '../types';

export interface TransformRawRuleTemplateToRuleTemplateParams {
  attributes: RawRuleTemplate;
  id: string;
}

const isAlertingV2Template = (
  attributes: RawRuleTemplate
): attributes is AlertingV2RawRuleTemplate =>
  attributes.engine === 'v2' && 'rule' in attributes;


/**
 * Maps Fleet-shaped template SOs to the v1 application RuleTemplate.
 * Alerting-v2 attribute docs are not supported by this transform (v1 find
 * filters them out via engine filter).
 */
export const transformRawRuleTemplateToRuleTemplate = (
  params: TransformRawRuleTemplateToRuleTemplateParams
): RuleTemplate => {
  const { attributes, id } = params;

  if (isAlertingV2Template(attributes)) {
    throw new Error(
      `Rule template "${id}" uses the alerting v2 attribute shape and cannot be loaded via the v1 rule template API`
    );
  }

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
