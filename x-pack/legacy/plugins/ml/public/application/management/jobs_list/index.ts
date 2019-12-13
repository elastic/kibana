/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM, { render, unmountComponentAtNode } from 'react-dom';
import React from 'react';
import routes from 'ui/routes';
import { canGetManagementMlJobs } from '../../privilege/check_privilege';
import { JOBS_LIST_PATH, ACCESS_DENIED_PATH } from '../management_urls';
import { JobsListPage, AccessDeniedPage } from './components';
import { getJobsListBreadcrumbs } from '../breadcrumbs';

const template = `<kbn-management-app section="ml/jobs-list">
<div id="kibanaManagementMLSection" />
</kbn-management-app>`;

routes.when(JOBS_LIST_PATH, {
  template,
  k7Breadcrumbs: getJobsListBreadcrumbs,
  resolve: {
    checkPrivilege: canGetManagementMlJobs,
  },
  controller($scope, checkPrivilege) {
    const { mlFeatureEnabledInSpace } = checkPrivilege;

    $scope.$on('$destroy', () => {
      const elem = document.getElementById('kibanaManagementMLSection');
      if (elem) unmountComponentAtNode(elem);
    });
    $scope.$$postDigest(() => {
      const element = document.getElementById('kibanaManagementMLSection');
      ReactDOM.render(
        React.createElement(JobsListPage, { isMlEnabledInSpace: mlFeatureEnabledInSpace }),
        element
      );
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
