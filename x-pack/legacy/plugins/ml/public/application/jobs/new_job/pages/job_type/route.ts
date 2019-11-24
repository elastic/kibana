/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

import { checkMlNodesAvailable } from '../../../../ml_nodes_check';
import { checkLicenseExpired } from '../../../../license/check_license';
import { checkCreateJobsPrivilege } from '../../../../privilege/check_privilege';
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from '../../../../util/index_utils';
import { getCreateJobBreadcrumbs } from '../../../breadcrumbs';

uiRoutes.when('/jobs/new_job/step/job_type', {
  template: '<ml-job-type-page />',
  k7Breadcrumbs: getCreateJobBreadcrumbs,
  resolve: {
    CheckLicense: checkLicenseExpired,
    privileges: checkCreateJobsPrivilege,
    indexPattern: loadCurrentIndexPattern,
    savedSearch: loadCurrentSavedSearch,
    checkMlNodesAvailable,
  },
});
