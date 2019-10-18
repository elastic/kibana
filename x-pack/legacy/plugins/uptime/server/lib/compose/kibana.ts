/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMXPackAuthAdapter } from '../adapters/auth';
import { UMKibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { UMKibanaBackendFrameworkAdapter } from '../adapters/framework';
import { ElasticsearchMonitorsAdapter } from '../adapters/monitors';
import { ElasticsearchPingsAdapter } from '../adapters/pings';
import { UMAuthDomain } from '../domains';
import { UMDomainLibs, UMServerLibs } from '../lib';
import { ElasticsearchMonitorStatesAdapter } from '../adapters/monitor_states';
import { UMKibanaSavedObjectsAdapter } from '../adapters/saved_objects/kibana_saved_objects_adapter';

export function compose(hapiServer: any): UMServerLibs {
  const framework = new UMKibanaBackendFrameworkAdapter(hapiServer);
  const database = new UMKibanaDatabaseAdapter(hapiServer.plugins.elasticsearch);
  const authDomain = new UMAuthDomain(new UMXPackAuthAdapter(hapiServer.plugins.xpack_main), {});

  const domainLibs: UMDomainLibs = {
    auth: authDomain,
    monitors: new ElasticsearchMonitorsAdapter(database),
    monitorStates: new ElasticsearchMonitorStatesAdapter(database),
    pings: new ElasticsearchPingsAdapter(database),
    savedObjects: new UMKibanaSavedObjectsAdapter(hapiServer),
  };

  const libs: UMServerLibs = {
    framework,
    database,
    ...domainLibs,
  };

  return libs;
}
