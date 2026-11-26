/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  alertingV1RawRuleTemplateSchemaV4,
  alertingV2RawRuleTemplateSchemaV4,
  rawRuleTemplateSchema,
} from './v4';

type RawRuleTemplate = TypeOf<typeof rawRuleTemplateSchema>;
type AlertingV1RawRuleTemplate = TypeOf<typeof alertingV1RawRuleTemplateSchemaV4>;
type AlertingV2RawRuleTemplate = TypeOf<typeof alertingV2RawRuleTemplateSchemaV4>;

export const isAlertingV2RawRuleTemplate = (
  attributes: RawRuleTemplate
): attributes is AlertingV2RawRuleTemplate => attributes.engine === 'v2' && 'rule' in attributes;

/**
 * Narrows raw template attributes to the Fleet / alerting v1 shape used by the
 * v1 rule template application API.
 */
export const assertAlertingV1RawRuleTemplate = (
  attributes: RawRuleTemplate,
  id: string
): AlertingV1RawRuleTemplate => {
  if (isAlertingV2RawRuleTemplate(attributes)) {
    throw new Error(
      `Rule template "${id}" uses the alerting v2 attribute shape and cannot be loaded via the v1 rule template API`
    );
  }
  return attributes;
};
