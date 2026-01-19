/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginInitializerContext } from '@kbn/core/server';

import type { ExperimentalFeatures } from '../common/experimental_features';
import {
  getExperimentalAllowedValues,
  isValidExperimentalValue,
  parseExperimentalConfigValue,
} from '../common/experimental_features';

const allowedExperimentalValues = getExperimentalAllowedValues();

export const configSchema = schema.object({
  rules: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  enableGeoTrackingThresholdAlert: schema.maybe(schema.boolean({ defaultValue: false })),
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
    validate(list) {
      for (const key of list) {
        if (!isValidExperimentalValue(key)) {
          return `[${key}] is not allowed. Allowed values are: ${allowedExperimentalValues.join(
            ', '
          )}`;
        }
      }
    },
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;

export type ConfigType = ConfigSchema & {
  experimentalFeatures: ExperimentalFeatures;
};

export const createConfig = (context: PluginInitializerContext): ConfigType => {
  const pluginConfig = context.config.get<TypeOf<typeof configSchema>>();
  const experimentalFeatures = parseExperimentalConfigValue(pluginConfig.enableExperimental);

  return {
    ...pluginConfig,
    experimentalFeatures,
  };
};
