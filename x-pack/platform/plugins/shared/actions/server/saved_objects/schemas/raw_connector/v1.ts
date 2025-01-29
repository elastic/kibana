/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rawConnectorSchema = schema.object({
  actionTypeId: schema.string(),
  name: schema.string(),
  isMissingSecrets: schema.boolean(),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  // Encrypted fields are saved as string. Decrypted version of the 'secrets' field is an object
  secrets: schema.string({ defaultValue: '{}' }),

  isPreconfigured: schema.maybe(schema.boolean()),
  isSystemAction: schema.maybe(schema.boolean()),
  id: schema.maybe(schema.string()),
  isDeprecated: schema.maybe(schema.boolean()),
});
