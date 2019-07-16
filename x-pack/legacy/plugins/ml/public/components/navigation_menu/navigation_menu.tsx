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
  dateFormat: string;
  tabId: string;
}

export const NavigationMenu: FC<Props> = ({ dateFormat, tabId }) => {
  const disableLinks = isFullLicense() === false;

  let showTabs = false;

  if (
    tabId === 'jobs' ||
    tabId === 'settings' ||
    tabId === 'data_frames' ||
    tabId === 'datavisualizer' ||
    tabId === 'filedatavisualizer' ||
    tabId === 'timeseriesexplorer' ||
    tabId === 'access-denied' ||
    tabId === 'explorer'
  ) {
    showTabs = true;
  }

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <TopNav dateFormat={dateFormat} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showTabs && <Tabs tabId={tabId} disableLinks={disableLinks} />}
    </Fragment>
  );
};
