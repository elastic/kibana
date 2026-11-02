/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionPolicySavedObjectAttributesSchemaV6 } from './v6';

/**
 * v7 adds `apiKeyUiamExternal`, set when `apiKey` is a user-created (external) Cloud API key,
 * which the dispatcher has to present without the UIAM shared secret.
 */
export const actionPolicySavedObjectAttributesSchemaV7 =
  actionPolicySavedObjectAttributesSchemaV6.extends({
    apiKeyUiamExternal: schema.maybe(schema.boolean()),
  });
