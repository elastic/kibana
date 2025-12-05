/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { ExperimentalFeatures } from './experimental_features';

export const ConfigSchema = schema.object({
  actionEnabled: schema.boolean({ defaultValue: false }),
  enabled: schema.boolean({ defaultValue: true }),
  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this settings need to
   * be defined in:
   * `x-pack/platform/plugins/shared/osquery/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   *
   * @example
   * xpack.osquery.enableExperimental:
   *   - someCrazyFeature
   *   - someEvenCrazierFeature
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
  }),
});

export type ConfigSchemaType = TypeOf<typeof ConfigSchema>;

export type ConfigType = ConfigSchemaType & {
  experimentalFeatures: ExperimentalFeatures;
};
