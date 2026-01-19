/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor, ExposedToBrowserDescriptor } from '@kbn/core/server';

/**
 * Config used by plugin to determine if orchestration is invoked,
 * and if the product intercept gets displayed on the client.
 */
export const configSchema = schema.object({
  /**
   * Denotes whether the product intercept orchestration is enabled.
   * It's worth noting that if the intercept plugin is disabled this setting will have no effect.
   */
  enabled: schema.boolean({
    defaultValue: true,
  }),
  /**
   * Configures the interval for the standard product intercept which a user would be prompted to provide feedback about kibana
   * Expects a limited subset of duration string; (d,m,h,s)
   */
  interval: schema.string({
    defaultValue: '90d',
    validate(value) {
      if (!/^[0-9]+(d|h|m|s)$/.test(value)) {
        return 'must be a supported duration string';
      }
    },
  }),
  /**
   * Configures the interval for the trial product intercept which a user would be prompted to provide feedback about kibana
   * Expects a limited subset of duration string; (d,m,h,s)
   */
  trialInterceptInterval: schema.string({
    defaultValue: '7d',
    validate(value) {
      if (!/^[0-9]+(d|h|m|s)$/.test(value)) {
        return 'must be a supported duration string';
      }
    },
  }),
  /**
   * Configures the interval for the upgrade product intercept which a user would be prompted to provide feedback about kibana
   * Expects a limited subset of duration string; (d,m,h,s)
   */
  upgradeInterceptInterval: schema.string({
    defaultValue: '7d',
    validate(value) {
      if (!/^[0-9]+(d|h|m|s)$/.test(value)) {
        return 'must be a supported duration string';
      }
    },
  }),
});

export type ServerConfigSchema = TypeOf<typeof configSchema>;

const browserConfigSchemaDescriptor: ExposedToBrowserDescriptor<ServerConfigSchema> = {
  interval: false,
  enabled: false,
};

export const config: PluginConfigDescriptor<ServerConfigSchema> = {
  exposeToBrowser: browserConfigSchemaDescriptor,
  schema: configSchema,
};
