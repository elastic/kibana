/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { makeApmUsageCollector } from '../lib/apm_telemetry';
import { CoreSetupWithUsageCollector } from '../lib/apm_telemetry/make_apm_usage_collector';
import { createApmAgentConfigurationIndex } from '../lib/settings/agent_configuration/create_agent_config_index';
import { createApmApi } from '../routes/create_apm_api';

export class Plugin {
  public setup(core: InternalCoreSetup) {
    createApmApi().init(core);
    createApmAgentConfigurationIndex(core);
    makeApmUsageCollector(core as CoreSetupWithUsageCollector);
  }
}
