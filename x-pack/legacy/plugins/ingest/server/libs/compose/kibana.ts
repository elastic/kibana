/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import { PLUGIN } from '../../../common/constants';
import { CONFIG_PREFIX } from '../../../common/constants/plugin';

import { DatabaseKbnESPlugin } from '../adapters/database/adapter_types';
import { KibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { KibanaLegacyServer } from '../adapters/framework/adapter_types';
import { KibanaBackendFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';

import { ServerLibs } from '../types';
import { BackendFrameworkLib } from './../framework';

export function compose(server: KibanaLegacyServer): ServerLibs {
  const framework = new BackendFrameworkLib(
    new KibanaBackendFrameworkAdapter(camelCase(PLUGIN.ID), server, CONFIG_PREFIX)
  );
  const database = new KibanaDatabaseAdapter(server.plugins.elasticsearch as DatabaseKbnESPlugin);

  const libs: ServerLibs = {
    framework,
    database,
  };

  return libs;
}
