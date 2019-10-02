/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { checkFullLicense } from '../../../../license/check_license';
import { checkGetJobsPrivilege } from '../../../../privilege/check_privilege';
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from '../../../../util/index_utils';

import {
  getCreateSingleMetricJobBreadcrumbs,
  getCreateMultiMetricJobBreadcrumbs,
  getCreatePopulationJobBreadcrumbs,
} from '../../../breadcrumbs';

import { Route } from '../../../../../common/types/kibana';

import { loadNewJobCapabilities } from '../../../../services/new_job_capabilities_service';

import { loadNewJobDefaults } from '../../../new_job/utils/new_job_defaults';

import { mlJobService } from '../../../../services/job_service';
import { JOB_TYPE } from '../../common/job_creator/util/constants';

const template = `<ml-new-job-page />`;

const routes: Route[] = [
  {
    id: JOB_TYPE.SINGLE_METRIC,
    k7Breadcrumbs: getCreateSingleMetricJobBreadcrumbs,
  },
  {
    id: JOB_TYPE.MULTI_METRIC,
    k7Breadcrumbs: getCreateMultiMetricJobBreadcrumbs,
  },
  {
    id: JOB_TYPE.POPULATION,
    k7Breadcrumbs: getCreatePopulationJobBreadcrumbs,
  },
];

routes.forEach((route: Route) => {
  uiRoutes.when(`/jobs/new_job/${route.id}`, {
    template,
    k7Breadcrumbs: route.k7Breadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      savedSearch: loadCurrentSavedSearch,
      loadNewJobCapabilities,
      loadNewJobDefaults,
      existingJobsAndGroups: mlJobService.getJobAndGroupIds,
      jobType: () => route.id,
    },
  });
});
