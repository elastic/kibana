/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { CoreSetup } from 'src/core/server';
import { makeApmUsageCollector } from '../lib/apm_telemetry';
import { createApmAgentConfigurationIndex } from '../lib/settings/agent_configuration/create_agent_config_index';
import { createApmApi } from '../routes/create_apm_api';

export interface LegacySetup {
  server: Server;
}

export class Plugin {
  public setup(core: CoreSetup, __LEGACY: LegacySetup) {
    createApmApi().init(core, __LEGACY);
    createApmAgentConfigurationIndex(core, __LEGACY);
    makeApmUsageCollector(core, __LEGACY);
  }
}
