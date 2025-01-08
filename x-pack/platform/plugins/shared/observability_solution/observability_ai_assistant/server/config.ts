/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const config = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  scope: schema.maybe(schema.oneOf([schema.literal('observability'), schema.literal('search')])),
  enableKnowledgeBase: schema.boolean({ defaultValue: true }),
});

export type ObservabilityAIAssistantConfig = TypeOf<typeof config>;
