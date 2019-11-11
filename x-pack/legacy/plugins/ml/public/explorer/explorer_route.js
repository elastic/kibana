/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

import '../components/controls';

import { checkFullLicense } from '../license/check_license';
import { checkGetJobsPrivilege } from '../privilege/check_privilege';
import { mlJobService } from '../services/job_service';
import { loadIndexPatterns } from '../util/index_utils';

import { getAnomalyExplorerBreadcrumbs } from './breadcrumbs';

uiRoutes
  .when('/explorer/?', {
    template: `<ml-explorer-directive class="ml-explorer" data-test-subj="mlPageAnomalyExplorer" />`,
    k7Breadcrumbs: getAnomalyExplorerBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      indexPatterns: loadIndexPatterns,
      jobs: mlJobService.loadJobsWrapper
    },
  });
