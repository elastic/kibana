/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

import type { ConfigType, ConfigSchemaType } from '../common/config';
import { parseExperimentalConfigValue } from '../common';

export const createConfig = (context: PluginInitializerContext): Readonly<ConfigType> => {
  const pluginConfig = context.config.get<ConfigSchemaType>();
  const logger = context.logger.get('config');

  const { invalid, features: experimentalFeatures } = parseExperimentalConfigValue(
    pluginConfig.enableExperimental
  );

  if (invalid.length) {
    logger.warn(`Unsupported "xpack.osquery.enableExperimental" values detected.
The following configuration values are not supported and should be removed from the configuration:

    xpack.osquery.enableExperimental:
${invalid.map((key) => `      - ${key}`).join('\n')}
`);
  }

  return {
    ...pluginConfig,
    experimentalFeatures,
  };
};
