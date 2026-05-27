/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { rawRuleTemplateSchema as rawRuleTemplateSchemaV1 } from './v1';
import { rawRuleTemplateSchema as rawRuleTemplateSchemaV2 } from './v2';
import { rawRuleTemplateSchema } from './v3';

export { rawRuleTemplateSchemaV1, rawRuleTemplateSchemaV2 };
export { rawRuleTemplateSchema as rawRuleTemplateSchemaV3 };

export type RawRuleTemplate = TypeOf<typeof rawRuleTemplateSchema>;
