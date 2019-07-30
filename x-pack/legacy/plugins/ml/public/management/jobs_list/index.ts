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

// @ts-ignore no declare module
import { ReactDOM, render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import 'plugins/security/services/shield_user';
import { JOBS_LIST_PATH } from '../management_urls';
import { JobsListPage } from './components';

const template = `<kbn-management-app section="ml/jobs-list">
<div id="jobsListReactRoot" />
</kbn-management-app>`;

routes.when(JOBS_LIST_PATH, {
  template,
  // k7Breadcrumbs: getJobsListBreadcrumbs, // TODO
  controller($scope, $http, kbnUrl) {
    $scope.$on('$destroy', () => {
      const elem = document.getElementById('jobsListReactRoot');
      if (elem) unmountComponentAtNode(elem);
    });
    $scope.$$postDigest(() => {
      const element = document.getElementById('jobsListReactRoot');
      render(JobsListPage(), element);
    });
  },
});
