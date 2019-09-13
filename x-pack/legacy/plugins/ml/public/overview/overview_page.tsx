/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiHorizontalRule, EuiPage, EuiPageBody, EuiTitle } from '@elastic/eui';
import { NavigationMenu } from '../components/navigation_menu/navigation_menu';
import { OverviewSideBar } from './components/sidebar';
import { OverviewContent } from './components/content';

export const OverviewPage: FC = () => {
  return (
    <Fragment>
      <NavigationMenu tabId="overview" />
      <EuiPage data-test-subj="mlPageOverview">
        <EuiPageBody>
          <EuiFlexGroup>
            <OverviewSideBar />
            <OverviewContent />
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
