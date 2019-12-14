/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

import '../components/controls';

import { checkFullLicense } from '../license/check_license';
import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
import { checkGetJobsPrivilege } from '../privilege/check_privilege';
import { mlJobService } from '../services/job_service';
import { loadIndexPatterns } from '../util/index_utils';

import { getSingleMetricViewerBreadcrumbs } from './breadcrumbs';

uiRoutes.when('/timeseriesexplorer/?', {
  template: '<ml-time-series-explorer data-test-subj="mlPageSingleMetricViewer" />',
  k7Breadcrumbs: getSingleMetricViewerBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    indexPatterns: loadIndexPatterns,
    mlNodeCount: getMlNodeCount,
    jobs: mlJobService.loadJobsWrapper,
  },
});
