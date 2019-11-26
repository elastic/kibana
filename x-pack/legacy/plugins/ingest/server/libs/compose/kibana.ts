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
import { PolicyLib } from '../policy';
import { PolicyAdapter } from '../adapters/policy/default';
import { SODatabaseAdapter } from '../adapters/so_database/default';
import { KibanaLegacyServer } from '../adapters/framework/adapter_types';
import { OutputsLib } from '../outputs';
import { DatasourcesLib } from '../datasources';

export function compose(server: KibanaLegacyServer): ServerLibs {
  const framework = new BackendFrameworkLib(
    new BackendFrameworkAdapter(camelCase(PLUGIN.ID), server, CONFIG_PREFIX)
  );
  const database = new ESDatabaseAdapter(server.plugins.elasticsearch as DatabaseKbnESPlugin);
  const soDatabase = new SODatabaseAdapter(server.savedObjects, server.plugins.elasticsearch);

  const outputs = new OutputsLib();

  const datasources = new DatasourcesLib();

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
