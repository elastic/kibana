/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { NavigationMenu } from '../../components/navigation_menu';

import { JobsListView } from './components/jobs_list_view';

export const JobsPage = (props) => (
  <Fragment>
    <NavigationMenu tabId="jobs" />
    <EuiTitle style={{ padding: '16px 16px 0 16px' }}>
      <h1>
        <FormattedMessage
          id="xpack.ml.jobsList.title"
          defaultMessage="Anomaly detection jobs"
        />
      </h1>
    </EuiTitle>
    <JobsListView {...props} />
  </Fragment>
);
