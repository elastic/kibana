/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { rawRuleTemplateSchema as rawRuleTemplateSchemaV1 } from './v1';
import { rawRuleTemplateSchema as rawRuleTemplateSchemaV2 } from './v2';
import { rawRuleTemplateSchema as rawRuleTemplateSchemaV3 } from './v3';
import {
  rawRuleTemplateSchema,
  alertingV1RawRuleTemplateSchemaV4,
  alertingV2RawRuleTemplateSchemaV4,
} from './v4';

export {
  rawRuleTemplateSchemaV1,
  rawRuleTemplateSchemaV2,
  rawRuleTemplateSchemaV3,
  alertingV1RawRuleTemplateSchemaV4,
  alertingV2RawRuleTemplateSchemaV4,
};
export { rawRuleTemplateSchema as rawRuleTemplateSchemaV4 };

export type RawRuleTemplate = TypeOf<typeof rawRuleTemplateSchema>;
export type AlertingV1RawRuleTemplate = TypeOf<typeof alertingV1RawRuleTemplateSchemaV4>;
export type AlertingV2RawRuleTemplate = TypeOf<typeof alertingV2RawRuleTemplateSchemaV4>;

export { assertAlertingV1RawRuleTemplate, isAlertingV2RawRuleTemplate } from './guards';
