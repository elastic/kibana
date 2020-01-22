/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import KbnServer from 'src/legacy/server/kbn_server';
import { PLUGIN } from '../../../common/constants';
import { CONFIG_PREFIX } from '../../../common/constants/plugin';
import { DatabaseKbnESPlugin } from '../adapters/es_database/adapter_types';
import { ESDatabaseAdapter } from '../adapters/es_database/default';
import { KibanaLegacyServer } from '../adapters/framework/adapter_types';
import { BackendFrameworkAdapter } from '../adapters/framework/default';
import { PolicyAdapter } from '../adapters/policy/default';
import { DatasourceAdapter } from '../adapters/datasource/default';
import { SODatabaseAdapter } from '../adapters/so_database/default';
import { DatasourcesLib } from '../datasources';
import { OutputsLib } from '../outputs';
import { PolicyLib } from '../policy';
import { ServerLibs } from '../types';
import { BackendFrameworkLib } from './../framework';
import { OutputAdapter } from '../adapters/outputs/default';
import { PluginSetupContract as SecurityPlugin } from '../../../../../../plugins/security/server';

export interface IngestPluginsStart {
  security: SecurityPluginStartContract;
}

export type SecurityPluginSetupContract = Pick<SecurityPlugin, '__legacyCompat'>;
export type SecurityPluginStartContract = Pick<SecurityPlugin, 'authc'>;

export function compose(server: KibanaLegacyServer): ServerLibs {
  const newPlatform = ((server as unknown) as KbnServer).newPlatform;
  const framework = new BackendFrameworkLib(
    new BackendFrameworkAdapter(camelCase(PLUGIN.ID), server, CONFIG_PREFIX)
  );

  const pluginsStart: IngestPluginsStart = {
    security: newPlatform.setup.plugins.security as SecurityPluginStartContract,
  };

  const database = new ESDatabaseAdapter(server.plugins.elasticsearch as DatabaseKbnESPlugin);
  const soDatabase = new SODatabaseAdapter(server.savedObjects, server.plugins.elasticsearch);

  const outputsAdapter = new OutputAdapter(soDatabase);

  const outputs = new OutputsLib({ framework }, outputsAdapter, pluginsStart);

  const datasourceAdapter = new DatasourceAdapter(soDatabase);
  const datasources = new DatasourcesLib(datasourceAdapter, { framework });

  const policyAdapter = new PolicyAdapter(soDatabase);
  const policy = new PolicyLib(policyAdapter, { framework, outputs, datasources });

  const libs: ServerLibs = {
    datasources,
    outputs,
    policy,
    framework,
    database,
  };

  return libs;
}
