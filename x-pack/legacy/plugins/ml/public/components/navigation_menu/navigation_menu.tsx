/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TopNav } from './top_nav';
import { Tabs } from './tabs';

interface Props {
  dateFormat: string;
  disableLinks: boolean;
  showTabs: boolean;
  tabId: string;
  timeHistory: any;
  timefilter: any;
}

export const NavigationMenu: FC<Props> = ({
  dateFormat,
  disableLinks,
  showTabs,
  tabId,
  timeHistory,
  timefilter,
}) => (
  <Fragment>
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs" className="mlNavigationMenu__topNav">
      <EuiFlexItem grow={false}>
        <TopNav dateFormat={dateFormat} timeHistory={timeHistory} timefilter={timefilter} />
      </EuiFlexItem>
    </EuiFlexGroup>
    {showTabs && <Tabs tabId={tabId} disableLinks={disableLinks} />}
  </Fragment>
);
