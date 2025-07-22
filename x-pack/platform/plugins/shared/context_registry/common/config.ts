/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const ContextRegistryConfigSchema = schema.object({
  unsafe: schema.maybe(
    schema.object({
      contextRegistryEnabled: schema.maybe(schema.boolean({ defaultValue: false })),
    })
  ),
});

export type ContextRegistryConfig = TypeOf<typeof ContextRegistryConfigSchema>;
export type ContextRegistryBrowserConfig = Pick<
  TypeOf<typeof ContextRegistryConfigSchema>,
  'unsafe'
>;
