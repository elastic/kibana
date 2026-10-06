/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  patternTester: schema.object({
    /**
     * Whether the pattern tester may run caller-supplied regexes. It only runs them on an
     * isolated worker pool, so turning this off makes the tester refuse requests instead.
     */
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type AiAnonymizationSettingsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AiAnonymizationSettingsConfig> = {
  schema: configSchema,
};
