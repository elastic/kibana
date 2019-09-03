/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { ConfigurationAdapter } from './adapter_types';

export class KibanaConfigurationAdapter<Configuration>
  implements ConfigurationAdapter<Configuration> {
  private readonly server: ServerWithConfig;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(server: any) {
    if (!isServerWithConfig(server)) {
      throw new Error('Failed to find configuration on server.');
    }

    this.server = server;
  }

  public async get() {
    const config = this.server.config();

    if (!isKibanaConfiguration(config)) {
      throw new Error('Failed to access configuration of server.');
    }

    const configuration = config.get('xpack.siem') || {};
    const configurationWithDefaults = {
      enabled: true,
      query: {
        partitionSize: 75,
        partitionFactor: 1.2,
        ...(configuration.query || {}),
      },
      sources: {},
      ...configuration,
    } as Configuration;

    // we assume this to be the configuration because Kibana would have already validated it
    return configurationWithDefaults;
  }
}

interface ServerWithConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config(): any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isServerWithConfig(maybeServer: any): maybeServer is ServerWithConfig {
  return (
    Joi.validate(
      maybeServer,
      Joi.object({
        config: Joi.func().required(),
      }).unknown()
    ).error === null
  );
}

interface KibanaConfiguration {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isKibanaConfiguration(maybeConfiguration: any): maybeConfiguration is KibanaConfiguration {
  return (
    Joi.validate(
      maybeConfiguration,
      Joi.object({
        get: Joi.func().required(),
      }).unknown()
    ).error === null
  );
}
