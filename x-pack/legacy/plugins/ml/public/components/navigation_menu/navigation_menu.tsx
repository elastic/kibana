/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

// @ts-ignore
import { isFullLicense } from '../../license/check_license';

import { TopNav } from './top_nav';
import { MainTabs } from './main_tabs';
import { Tabs } from './tabs';

export type TabId = string;

const tabSupport = {
  jobs: 'anomaly_detection',
  settings: 'anomaly_detection',
  data_frames: 'main_data_frame_analytics',
  data_frame_analytics: 'main_data_frame_analytics',
  datavisualizer: 'data_visualizer',
  filedatavisualizer: 'data_visualizer',
  timeseriesexplorer: 'anomaly_detection',
  'access-denied': '',
  explorer: 'anomaly_detection',
};

type tabSupportId = keyof typeof tabSupport;

interface Props {
  tabId: TabId;
}

function getMainTabId(tabId: TabId): string {
  if (tabId === 'datavisualizer' || tabId === 'access-denied') {
    return tabId;
  }
  return tabSupport[tabId as tabSupportId];
}

export const NavigationMenu: FC<Props> = ({ tabId }) => {
  const disableLinks = isFullLicense() === false;
  const showTabs = Object.keys(tabSupport).includes(tabId);
  const mainTabId = getMainTabId(tabId);
  const showHorizontalRule = tabId === 'datavisualizer';

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {showTabs && <MainTabs tabId={mainTabId} disableLinks={disableLinks} />}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TopNav />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showHorizontalRule && <EuiHorizontalRule />}
      {showTabs && <Tabs tabId={tabId} mainTabId={mainTabId} disableLinks={disableLinks} />}
    </Fragment>
  );
};
