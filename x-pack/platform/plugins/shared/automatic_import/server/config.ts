/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this settings need to
   * be defined in:
   * `x-pack/platform/plugins/shared/automatic_import/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   *
   * @example
   * xpack.automatic_import.enableExperimental:
   *   - someCrazyFeature
   *   - someEvenCrazierFeature
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
  }),
});
export type AutomaticImportConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AutomaticImportConfigType> = {
  exposeToBrowser: {
    enableExperimental: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.integration_assistant.enabled', 'xpack.automatic_import.enabled', {
      level: 'critical',
    }),
    renameFromRoot(
      'xpack.integration_assistant.enableExperimental',
      'xpack.automatic_import.enableExperimental',
      {
        level: 'critical',
      }
    ),
  ],
};
