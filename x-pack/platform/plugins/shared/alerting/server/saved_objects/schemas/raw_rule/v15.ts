/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV14 } from './v14';

export const rawRuleSchema = rawRuleSchemaV14.extends({
  // UIAM's verdict on whether `uiamApiKey` is an external (user-created Cloud) API key, captured
  // from `AuthenticatedUser.api_key.internal === false` when the rule was created or updated.
  // External keys must not be presented to Elasticsearch with the UIAM shared secret, so rule
  // runs mark their fake request accordingly. Absent for framework-granted keys and for rules
  // predating this attribute, both of which keep the internal-key treatment.
  uiamApiKeyExternal: schema.maybe(schema.nullable(schema.boolean())),
});
