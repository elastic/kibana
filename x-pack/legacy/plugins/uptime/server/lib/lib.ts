/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from './adapters/database';
import { UMBackendFrameworkAdapter } from './adapters/framework';
import { UMMonitorsDomain, UMPingsDomain } from './domains';
import { UMAuthDomain } from './domains/auth';
import { UMMonitorStatesAdapter } from './adapters/monitor_states';
import { UMSavedObjectsDomain } from './domains/saved_objects';

export interface UMDomainLibs {
  auth: UMAuthDomain;
  monitors: UMMonitorsDomain;
  monitorStates: UMMonitorStatesAdapter;
  pings: UMPingsDomain;
  savedObjects: UMSavedObjectsDomain;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
  database?: DatabaseAdapter;
}
