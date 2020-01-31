/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { NavigationMenu } from '../../components/navigation_menu';

import { JobsListView } from './components/jobs_list_view';

export const JobsPage = props => (
  <Fragment>
    <NavigationMenu tabId="jobs" />
    <JobsListView {...props} />
  </Fragment>
);
