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
import { UMAuthDomain, UMMonitorsDomain, UMPingsDomain } from '../domains';
import { UMDomainLibs, UMServerLibs } from '../lib';
import { UMMonitorStatesDomain } from '../domains/monitor_states';
import { ElasticsearchMonitorStatesAdapter } from '../adapters/monitor_states';
import { KibanaCore } from '../adapters/framework';

export function compose(server: KibanaCore): UMServerLibs {
  const framework = new UMKibanaBackendFrameworkAdapter(server);
  const database = new UMKibanaDatabaseAdapter(server.elasticsearch);

  const authDomain = new UMAuthDomain(new UMXPackAuthAdapter(server.xpack), {});
  const monitorsDomain = new UMMonitorsDomain(new ElasticsearchMonitorsAdapter(database), {});
  const monitorStatesDomain = new UMMonitorStatesDomain(
    new ElasticsearchMonitorStatesAdapter(database),
    {}
  );
  const pingsDomain = new UMPingsDomain(new ElasticsearchPingsAdapter(database), {});
  const savedObjectsDomain = new UMSavedObjectsDomain(savedObjects, {});

  const domainLibs: UMDomainLibs = {
    auth: authDomain,
    monitors: monitorsDomain,
    monitorStates: monitorStatesDomain,
    pings: pingsDomain,
    savedObjects: savedObjectsDomain,
  };

  return {
    framework,
    database,
    ...domainLibs,
  };
}
