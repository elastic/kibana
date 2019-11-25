/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

import { isFullLicense } from '../../license/check_license';

import { TopNav } from './top_nav';
import { MainTabs } from './main_tabs';
import { Tabs } from './tabs';

export type TabId = string;
type TabSupport = Record<TabId, string | null>;

const tabSupport: TabSupport = {
  overview: null,
  jobs: 'anomaly_detection',
  settings: 'anomaly_detection',
  data_frame_analytics: null,
  datavisualizer: null,
  filedatavisualizer: null,
  timeseriesexplorer: 'anomaly_detection',
  'access-denied': null,
  explorer: 'anomaly_detection',
};

interface Props {
  tabId: TabId;
}

export const NavigationMenu: FC<Props> = ({ tabId }) => {
  const disableLinks = isFullLicense() === false;
  const showTabs = typeof tabSupport[tabId] !== 'undefined';
  const mainTabId = tabSupport[tabId] || tabId;
  // show horizontal rule if there are no subtabs
  const showHorizontalRule = tabSupport[tabId] === null;

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
      {showHorizontalRule && <EuiHorizontalRule className="mlNavHorizontalRule" />}
      {showTabs && <Tabs tabId={tabId} mainTabId={mainTabId} disableLinks={disableLinks} />}
    </Fragment>
  );
};
