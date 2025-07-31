/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const CaseSuggestionRegistryConfigSchema = schema.object({
  unsafe: schema.maybe(
    schema.object({
      caseSuggestionRegistryEnabled: schema.maybe(schema.boolean({ defaultValue: false })),
    })
  ),
});

export type CaseSuggestionRegistryConfig = TypeOf<typeof CaseSuggestionRegistryConfigSchema>;
export type CaseSuggestionRegistryBrowserConfig = Pick<
  TypeOf<typeof CaseSuggestionRegistryConfigSchema>,
  'unsafe'
>;
