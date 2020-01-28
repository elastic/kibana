/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMKibanaBackendFrameworkAdapter } from '../adapters/framework';
import { elasticsearchMonitorsAdapter } from '../adapters/monitors';
import * as databaseCalls from '../database_calls';
import { licenseCheck } from '../domains';
import { UMDomainLibs, UMServerLibs } from '../lib';
import { elasticsearchMonitorStatesAdapter } from '../adapters/monitor_states';
import { savedObjectsAdapter } from '../adapters/saved_objects';
import { UptimeCorePlugins, UptimeCoreSetup } from '../adapters/framework';

export function compose(server: UptimeCoreSetup, plugins: UptimeCorePlugins): UMServerLibs {
  const framework = new UMKibanaBackendFrameworkAdapter(server);

  const domainLibs: UMDomainLibs = {
    db: {
      ...databaseCalls,
    },
    license: licenseCheck,
    monitors: elasticsearchMonitorsAdapter,
    monitorStates: elasticsearchMonitorStatesAdapter,
    savedObjects: savedObjectsAdapter,
  };

  return {
    framework,
    ...domainLibs,
  };
}
