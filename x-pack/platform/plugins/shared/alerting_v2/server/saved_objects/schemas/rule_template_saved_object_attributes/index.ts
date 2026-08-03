/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { ruleTemplateSavedObjectAttributesSchema } from './v1';

export type RuleTemplateSavedObjectAttributes = TypeOf<
  typeof ruleTemplateSavedObjectAttributesSchema
>;

export { ruleTemplateSavedObjectAttributesSchema as ruleTemplateSavedObjectAttributesSchemaV1 };
