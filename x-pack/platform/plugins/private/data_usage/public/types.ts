/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataUsagePublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataUsagePublicStart {}

export interface DataUsageSetupDependencies {
  management: ManagementSetup;
  share: SharePluginSetup;
}

export interface DataUsageStartDependencies {
  management: ManagementStart;
  share: SharePluginStart;
}

const schemaObject = schema.object({
  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this settings need to
   * be defined in:
   * `x-pack/plugins/dataUsage/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   *
   * @example
   * xpack.dataUsage.enableExperimental: ['someFeature']
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
  }),
});

export type DataUsagePublicConfigType = TypeOf<typeof schemaObject>;
