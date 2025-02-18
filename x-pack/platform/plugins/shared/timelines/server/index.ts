/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ConfigSchema } from './config';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { TimelinesPlugin } = await import('./plugin');
  return new TimelinesPlugin(initializerContext);
}

export type { TimelinesPluginUI, TimelinesPluginStart } from './types';

const configSchema = schema.object({
  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this settings need to
   * be defined in:
   * `x-pack/platform/plugins/shared/timelines/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   *
   * @example
   * xpack.timelines.enableExperimental:
   *   - someCrazyFeature
   *   - someEvenCrazierFeature
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
  }),
});

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    enableExperimental: true,
  },
  schema: configSchema,
};
