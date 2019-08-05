/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no declaration module
import { ReactDOM, render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import { canGetManagementMlJobs } from '../../privilege/check_privilege';
import { JOBS_LIST_PATH } from '../management_urls';
import { JobsListPage } from './components';
import { AccessDeniedPage } from './components';
import { getJobsListBreadcrumbs } from '../breadcrumbs';
import { ACCESS_DENIED_PATH } from '../management_urls';

const template = `<kbn-management-app section="ml/jobs-list">
<div id="kibanaManagementMLSection" />
</kbn-management-app>`;

routes.when(JOBS_LIST_PATH, {
  template,
  k7Breadcrumbs: getJobsListBreadcrumbs,
  resolve: {
    checkPrivilege: canGetManagementMlJobs,
  },
  controller($scope) {
    $scope.$on('$destroy', () => {
      const elem = document.getElementById('kibanaManagementMLSection');
      if (elem) unmountComponentAtNode(elem);
    });
    $scope.$$postDigest(() => {
      const element = document.getElementById('kibanaManagementMLSection');
      render(JobsListPage(), element);
    });
  },
});

routes.when(ACCESS_DENIED_PATH, {
  template,
  k7Breadcrumbs: getJobsListBreadcrumbs,
  controller($scope) {
    $scope.$on('$destroy', () => {
      const elem = document.getElementById('kibanaManagementMLSection');
      if (elem) unmountComponentAtNode(elem);
    });
    $scope.$$postDigest(() => {
      const element = document.getElementById('kibanaManagementMLSection');
      render(AccessDeniedPage(), element);
    });
  },
});
