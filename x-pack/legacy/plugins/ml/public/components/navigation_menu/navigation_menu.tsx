/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

// @ts-ignore
import { isFullLicense } from '../../license/check_license';

import { TopNav } from './top_nav';
import { Tabs } from './tabs';

interface Props {
  tabId: string;
}

export const NavigationMenu: FC<Props> = ({ tabId }) => {
  const disableLinks = isFullLicense() === false;

  const showTabs =
    tabId === 'jobs' ||
    tabId === 'settings' ||
    tabId === 'data_frames' ||
    tabId === 'datavisualizer' ||
    tabId === 'filedatavisualizer' ||
    tabId === 'timeseriesexplorer' ||
    tabId === 'access-denied' ||
    tabId === 'explorer';

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <TopNav />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showTabs && <Tabs tabId={tabId} disableLinks={disableLinks} />}
    </Fragment>
  );
};
