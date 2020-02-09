/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { NavigationMenu } from '../../components/navigation_menu';

// @ts-ignore
import { JobsListView } from './components/jobs_list_view';

export const JobsPage: FC<{ props?: any }> = props => {
  return (
    <div data-test-subj="mlPageJobManagement">
      <NavigationMenu tabId="jobs" />
      <JobsListView {...props} />
    </div>
  );
};
