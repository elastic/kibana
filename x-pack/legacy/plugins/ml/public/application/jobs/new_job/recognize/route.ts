/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import { checkMlNodesAvailable } from '../../..//ml_nodes_check/check_ml_nodes';
import { checkLicenseExpired } from '../../..//license/check_license';
import { getCreateRecognizerJobBreadcrumbs } from '../../breadcrumbs';
import { checkCreateJobsPrivilege } from '../../../privilege/check_privilege';
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from '../../../util/index_utils';
import { mlJobService } from '../../../services/job_service';
import { checkViewOrCreateJobs } from './resolvers';

uiRoutes.when('/jobs/new_job/recognize', {
  template: '<ml-recognize-page />',
  k7Breadcrumbs: getCreateRecognizerJobBreadcrumbs,
  resolve: {
    CheckLicense: checkLicenseExpired,
    privileges: checkCreateJobsPrivilege,
    indexPattern: loadCurrentIndexPattern,
    savedSearch: loadCurrentSavedSearch,
    checkMlNodesAvailable,
    existingJobsAndGroups: mlJobService.getJobAndGroupIds,
  },
});

uiRoutes.when('/modules/check_view_or_create', {
  template: '<ml-recognize-page />',
  resolve: {
    checkViewOrCreateJobs,
  },
});
