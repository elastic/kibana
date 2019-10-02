/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
// @ts-ignore
import { preConfiguredJobRedirect } from 'plugins/ml/jobs/new_job/wizard/preconfigured_job_redirect';
import uiRoutes from 'ui/routes';
// @ts-ignore
import { checkLicenseExpired, checkBasicLicense } from '../../../../license/check_license';
import { loadIndexPatterns } from '../../../../util/index_utils';
import {
  checkCreateJobsPrivilege,
  checkFindFileStructurePrivilege,
} from '../../../../privilege/check_privilege';
import {
  getCreateJobBreadcrumbs,
  getDataVisualizerIndexOrSearchBreadcrumbs,
} from '../../../breadcrumbs';

uiRoutes.when('/jobs/new_job', {
  redirectTo: '/jobs/new_job/step/index_or_search',
});

uiRoutes.when('/jobs/new_job/step/index_or_search', {
  template: '<ml-index-or-search></ml-index-or-search>',
  k7Breadcrumbs: getCreateJobBreadcrumbs,
  resolve: {
    CheckLicense: checkLicenseExpired,
    privileges: checkCreateJobsPrivilege,
    indexPatterns: loadIndexPatterns,
    preConfiguredJobRedirect,
    checkMlNodesAvailable,
    nextStepPath: () => '#/jobs/new_job/step/job_type',
  },
});

uiRoutes.when('/datavisualizer_index_select', {
  template: '<ml-index-or-search></ml-index-or-search>',
  k7Breadcrumbs: getDataVisualizerIndexOrSearchBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkFindFileStructurePrivilege,
    indexPatterns: loadIndexPatterns,
    nextStepPath: () => '#jobs/new_job/datavisualizer',
  },
});
