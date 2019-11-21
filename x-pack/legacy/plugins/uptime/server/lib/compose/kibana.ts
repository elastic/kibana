/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMKibanaBackendFrameworkAdapter } from '../adapters/framework';
import { ElasticsearchMonitorsAdapter } from '../adapters/monitors';
import { ElasticsearchPingsAdapter } from '../adapters/pings';
import { licenseCheck } from '../domains';
import { UMDomainLibs, UMServerLibs } from '../lib';
import { elasticsearchMonitorStatesAdapter } from '../adapters/monitor_states';
import { UMKibanaSavedObjectsAdapter } from '../adapters/saved_objects/kibana_saved_objects_adapter';
import { UptimeCorePlugins, UptimeCoreSetup } from '../adapters/framework';

export function compose(server: UptimeCoreSetup, plugins: UptimeCorePlugins): UMServerLibs {
  const { savedObjects } = plugins;
  const framework = new UMKibanaBackendFrameworkAdapter(server, plugins);

  const domainLibs: UMDomainLibs = {
    license: licenseCheck,
    monitors: new ElasticsearchMonitorsAdapter(database),
    monitorStates: elasticsearchMonitorStatesAdapter,
    pings: new ElasticsearchPingsAdapter(database),
    savedObjects: new UMKibanaSavedObjectsAdapter(savedObjects, elasticsearch),
  };

  return {
    framework,
    database,
    ...domainLibs,
  };
}
