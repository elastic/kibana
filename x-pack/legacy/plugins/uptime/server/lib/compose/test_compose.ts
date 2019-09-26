/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMemoryAuthAdapter } from '../adapters/auth';
import { UMTestBackendFrameworkAdapter } from '../adapters/framework/test_backend_framework_adapter';
import { UMMemoryMonitorsAdapter } from '../adapters/monitors';
import { MemoryPingsAdapter } from '../adapters/pings/memory_pings_adapter';
import { UMAuthDomain, UMMonitorsDomain, UMPingsDomain, UMMonitorStatesDomain } from '../domains';
import { UMServerLibs } from '../lib';
import { UMMemoryMonitorStatesAdapter } from '../adapters/monitor_states';
import { UMSavedObjectsDomain } from '../domains/saved_objects';
import { UMMemorySavedObjectsAdapter } from '../adapters/saved_objects';

export function compose(server: any): UMServerLibs {
  const framework = new UMTestBackendFrameworkAdapter(server);

  const pingsDomain = new UMPingsDomain(new MemoryPingsAdapter(server.pingsDB || []), framework);
  const authDomain = new UMAuthDomain(new UMMemoryAuthAdapter(server.xpack), framework);
  const monitorsDomain = new UMMonitorsDomain(new UMMemoryMonitorsAdapter(), framework);
  const monitorStatesDomain = new UMMonitorStatesDomain(
    new UMMemoryMonitorStatesAdapter(),
    framework
  );
  const savedObjectsDomain = new UMSavedObjectsDomain(new UMMemorySavedObjectsAdapter(), framework);

  const libs: UMServerLibs = {
    auth: authDomain,
    framework,
    pings: pingsDomain,
    monitors: monitorsDomain,
    monitorStates: monitorStatesDomain,
    savedObjects: savedObjectsDomain,
  };

  return libs;
}
