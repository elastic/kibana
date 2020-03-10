/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import React from 'react';
// import { canGetManagementMlJobs } from '../../privilege/check_privilege';
// import { JOBS_LIST_PATH, ACCESS_DENIED_PATH } from '../management_urls';
// import { JobsListPage, AccessDeniedPage } from './components';
import { JobsListPage } from './components';
// import { getJobsListBreadcrumbs } from '../breadcrumbs';

export const renderApp = (element: HTMLElement, appDependencies: any) => {
  // const { mlFeatureEnabledInSpace } = checkPrivilege;
  const mlFeatureEnabledInSpace = true;
  ReactDOM.render(
    React.createElement(JobsListPage, { isMlEnabledInSpace: mlFeatureEnabledInSpace }),
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
