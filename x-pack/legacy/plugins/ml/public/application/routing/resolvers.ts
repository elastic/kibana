/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadIndexPatterns, loadSavedSearches } from '../util/index_utils';
import { cacheTimefilter } from '../util/timefilter_cache';
import { checkFullLicense } from '../license/check_license';
import { checkGetJobsPrivilege } from '../privilege/check_privilege';
import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
import { loadMlServerInfo } from '../services/ml_server_info';
import { PageDependencies } from './router';

export interface Resolvers {
  [name: string]: () => Promise<any>;
}
export interface ResolverResults {
  [name: string]: any;
}
export const basicResolvers = ({ indexPatterns, timefilter }: PageDependencies): Resolvers => ({
  checkFullLicense,
  getMlNodeCount,
  loadMlServerInfo,
  loadIndexPatterns: () => loadIndexPatterns(indexPatterns),
  checkGetJobsPrivilege,
  loadSavedSearches,
  cacheTimefilter: () => cacheTimefilter(timefilter),
});
