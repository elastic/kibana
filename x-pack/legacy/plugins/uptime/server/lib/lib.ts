/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMAuthDomain } from './domains';
import {
  DatabaseAdapter,
  UMBackendFrameworkAdapter,
  UMMonitorsAdapter,
  UMMonitorStatesAdapter,
  UMPingsAdapter,
  UMSavedObjectsAdapter,
} from './adapters';

export interface UMDomainLibs {
  auth: UMAuthDomain;
  monitors: UMMonitorsAdapter;
  monitorStates: UMMonitorStatesAdapter;
  pings: UMPingsAdapter;
  savedObjects: UMSavedObjectsAdapter;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
  database?: DatabaseAdapter;
}
