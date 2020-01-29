/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UMBackendFrameworkAdapter,
  UMMonitorStatesAdapter,
  UMSavedObjectsAdapter,
} from './adapters';
import { UMLicenseCheck } from './domains';
import { UptimeRequests } from './requests';

export interface UMDomainLibs {
  requests: UptimeRequests;
  license: UMLicenseCheck;
  monitorStates: UMMonitorStatesAdapter;
  savedObjects: UMSavedObjectsAdapter;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
}
