/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { makeApmUsageCollector } from '../lib/apm_telemetry';
import { CoreSetupWithUsageCollector } from '../lib/apm_telemetry/make_apm_usage_collector';
import { initErrorsApi } from '../routes/errors/init';
import { initMetricsApi } from '../routes/metrics/init';
import { initServicesApi } from '../routes/services/init';
import { initTracesApi } from '../routes/traces/init';
import { initTransactionGroupsApi } from '../routes/transaction_groups/init';
import { initUIFiltersApi } from '../routes/ui_filters/init';
import { initIndexPatternApi } from '../routes/index_patterns/index_pattern';
import { initSettingsApi } from '../routes/agent_configuration/init';

export class Plugin {
  public setup(core: InternalCoreSetup) {
    initUIFiltersApi(core);
    initTransactionGroupsApi(core);
    initTracesApi(core);
    initServicesApi(core);
    initSettingsApi(core);
    initErrorsApi(core);
    initMetricsApi(core);
    initIndexPatternApi(core);
    makeApmUsageCollector(core as CoreSetupWithUsageCollector);
  }
}
