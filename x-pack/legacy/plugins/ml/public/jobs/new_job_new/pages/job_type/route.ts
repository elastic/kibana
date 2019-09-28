/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { getCreateJobBreadcrumbs } from 'plugins/ml/jobs/breadcrumbs';
// @ts-ignore
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
// @ts-ignore
import { checkLicenseExpired } from '../../../../license/check_license';
import { checkCreateJobsPrivilege } from '../../../../privilege/check_privilege';
// @ts-ignore
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from '../../../../util/index_utils';
// @ts-ignore

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
