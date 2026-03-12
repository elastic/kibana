/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { offeringBasedSchema, schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

export const dataSourceExclusionsSchema = schema.recordOf(
  schema.string(),
  schema.arrayOf(schema.oneOf([schema.literal('readOnly'), schema.literal('reindex')]), {
    maxSize: 1000,
  }),
  { defaultValue: {} }
);

export const featureSetSchema = schema.object({
  /**
   * Ml Snapshot should only be enabled for major version upgrades. Currently this
   * is manually set to `true` on every `x.last` version.
   * ML Upgrade mode can be toggled from outside Kibana, the purpose
   * of this feature guard is to hide all ML related deprecations from the end user
   * until the next major upgrade.
   *
   * When we want to enable ML model snapshot deprecation warnings again we need
   * to change the constant `MachineLearningField.MIN_CHECKED_SUPPORTED_SNAPSHOT_VERSION`
   * to something higher than 7.0.0 in the Elasticsearch code.
   */
  mlSnapshots: schema.boolean({ defaultValue: true }),
  /**
   * Migrating system indices should only be enabled for major version upgrades.
   * Currently this is manually set to `true` on every `x.last` version.
   */
  migrateSystemIndices: schema.boolean({ defaultValue: true }),
  /**
   * Deprecations with reindexing corrective actions are only enabled for major version upgrades.
   * Currently this is manually set to `true` on every `x.last` version.
   *
   * The reindex action includes some logic that is specific to the 8.0 upgrade
   * End users could get into a bad situation if this is enabled before this logic is fixed.
   */
  reindexCorrectiveActions: schema.boolean({ defaultValue: true }),
  /**
   * Migrating deprecated data streams should only be enabled for major version upgrades.
   * Currently this is manually set to `true` on every `x.last` version.
   */
  migrateDataStreams: schema.boolean({ defaultValue: true }),
});

// -------------------------------
// >= 8.6 UA is always enabled to guide stack upgrades
// even for minor releases.
// -------------------------------
const configSchema = schema.object({
  /**
   * Disables the plugin.
   */
  enabled: offeringBasedSchema({
    // Upgrade Assistant is disabled in serverless; refer to the serverless.yml file as the source of truth
    // We take this approach in order to have a central place (serverless.yml) to view disabled plugins across Kibana
    serverless: schema.boolean({ defaultValue: true }),
  }),

  /**
   * Exlcude certain data streams or indices from getting certain correctiveActions.
   * The key is the data source name or pattern and the value is an array of corrective actions to exclude.
   *
   * Exclude readOnly data sources from getting read-only corrective actions.
   * This is needed to avoid breaking certain built-in/system functionality that might rely on writing to these data sources.
   * Example (excludes read-only corrective actions for 7_17_data_stream):
   * xpack.upgrade_assistant.dataSourceExclusions:
   *    7_17_data_stream: ["readOnly"]
   */
  dataSourceExclusions: dataSourceExclusionsSchema,
  featureSet: featureSetSchema,
  /**
   * This config allows to hide the UI without disabling the plugin.
   */
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export type UpgradeAssistantConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<UpgradeAssistantConfig> = {
  exposeToBrowser: {
    ui: true,
    featureSet: true,
  },
  schema: configSchema,
  deprecations: () => [],
};
