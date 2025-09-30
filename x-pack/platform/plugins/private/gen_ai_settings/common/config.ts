/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

/**
 * Configuration schema for the genAiSettings plugin
 */
const configSchema = schema.object({
  showAiBreadcrumb: schema.boolean({ defaultValue: true }),
  showSpacesIntegration: schema.boolean({ defaultValue: true }),
  showAiAssistantsVisibilitySetting: schema.boolean({ defaultValue: true }),
});

export type GenAiSettingsConfigType = TypeOf<typeof configSchema>;

/**
 * Configuration for the genAiSettings plugin
 */
export const config: PluginConfigDescriptor<GenAiSettingsConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    showAiBreadcrumb: true,
    showSpacesIntegration: true,
    showAiAssistantsVisibilitySetting: true,
  },
};
