/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadIndexPatterns } from '../util/index_utils';
import { checkFullLicense } from '../license/check_license';
import { checkGetJobsPrivilege } from '../privilege/check_privilege';
import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
// import { getJobManagementBreadcrumbs } from './jobs/breadcrumbs';
import { loadMlServerInfo } from '../services/ml_server_info';

export interface Resolvers {
  [name: string]: () => Promise<any>;
}
export interface ResolverResults {
  [name: string]: any;
}
export const basicResolvers: Resolvers = {
  checkFullLicense,
  getMlNodeCount,
  loadMlServerInfo,
  loadIndexPatterns,
  checkGetJobsPrivilege,
  // getJobManagementBreadcrumbs(),
};
