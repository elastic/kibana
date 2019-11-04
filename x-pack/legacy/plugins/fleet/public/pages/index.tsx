/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnforceSecurityPage } from './error/enforce_security';
import { InvalidLicensePage } from './error/invalid_license';
import { NoAccessPage } from './error/no_access';
import { AgentListPage } from './agent_list';
import { AgentDetailsPage } from './agent_details';
import { PolicyListPage } from './policy_list';
// import { PolicyDetailsPage } from './policy_details';

export const routeMap = [
  { path: '/error/enforce_security', component: EnforceSecurityPage },
  { path: '/error/invalid_license', component: InvalidLicensePage },
  { path: '/error/no_access', component: NoAccessPage },
  { path: '/agents/:agentId', component: AgentDetailsPage },
  { path: '/agents', component: AgentListPage },
  // { path: '/policies/:agentId', component: PolicyDetailsPage },
  { path: '/policies', component: PolicyListPage },
];
