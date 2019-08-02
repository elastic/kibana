/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaConfig } from 'src/legacy/server/kbn_server';

export function getXpackConfigWithDeprecated(config: KibanaConfig, configPath: string) {
  const deprecatedConfig = config.get(`xpack.xpack_main.${configPath}`);
  if (typeof deprecatedConfig !== 'undefined') {
    return deprecatedConfig;
  }
  return config.get(`xpack.${configPath}`);
}
