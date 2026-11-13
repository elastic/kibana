/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { offeringBasedSchema, schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

/**
 * `enabled` is load-bearing: `ConfigService.isEnabledAtPath` throws when
 * `kibana.yml` sets `enabled` for a namespace whose schema does not declare it.
 */
const configSchema = schema.object({
  enabled: offeringBasedSchema({
    serverless: schema.boolean({ defaultValue: false }),
    traditional: schema.boolean({ defaultValue: true }),
  }),
});

export type AgentKnowledgeConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AgentKnowledgeConfig> = {
  schema: configSchema,
};
