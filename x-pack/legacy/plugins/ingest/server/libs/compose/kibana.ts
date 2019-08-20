/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import { PLUGIN } from '../../../common/constants';
import { CONFIG_PREFIX } from '../../../common/constants/plugin';
import { DatabaseKbnESPlugin } from '../adapters/es_database/adapter_types';
import { ESDatabaseAdapter } from '../adapters/es_database/default';
import { BackendFrameworkAdapter } from '../adapters/framework/default';
import { ServerLibs } from '../types';
import { BackendFrameworkLib } from './../framework';
import { ConfigurationLib } from '../configuration';
import { ConfigAdapter } from '../adapters/configurations/default';
import { SODatabaseAdapter } from '../adapters/so_database/default';
import { KibanaLegacyServer } from '../adapters/framework/adapter_types';

export function compose(server: KibanaLegacyServer): ServerLibs {
  const framework = new BackendFrameworkLib(
    new BackendFrameworkAdapter(camelCase(PLUGIN.ID), server, CONFIG_PREFIX)
  );
  const database = new ESDatabaseAdapter(server.plugins.elasticsearch as DatabaseKbnESPlugin);
  const soDatabase = new SODatabaseAdapter(server.savedObjects, server.plugins.elasticsearch);

  const configAdapter = new ConfigAdapter(soDatabase);
  const configuration = new ConfigurationLib(configAdapter, { framework });

  const libs: ServerLibs = {
    configuration,
    framework,
    database,
  };

  return libs;
}
