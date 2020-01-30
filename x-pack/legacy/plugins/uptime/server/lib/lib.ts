/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UMBackendFrameworkAdapter,
  UMMonitorsAdapter,
  UMMonitorStatesAdapter,
  UMPingsAdapter,
  StubIndexPatternAdapter,
} from './adapters';
import { UMLicenseCheck } from './domains';

export interface UMDomainLibs {
  license: UMLicenseCheck;
  monitors: UMMonitorsAdapter;
  monitorStates: UMMonitorStatesAdapter;
  pings: UMPingsAdapter;
  stubIndexPattern: StubIndexPatternAdapter;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
}
