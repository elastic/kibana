/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import { matchPath, Route, RouteComponentProps } from 'react-router-dom';
import { useLocation } from '../../../hooks/useLocation';
import { history } from '../../../utils/history';

export interface IHistoryTab {
  path: string;
  routePath?: string;
  name: React.ReactNode;
  render?: (props: RouteComponentProps) => React.ReactNode;
}

export interface HistoryTabsProps {
  tabs: IHistoryTab[];
}

function isTabSelected(tab: IHistoryTab, currentPath: string) {
  if (tab.routePath) {
    return !!matchPath(currentPath, { path: tab.routePath, exact: true });
  }
  return currentPath === tab.path;
}

export function HistoryTabs({ tabs }: HistoryTabsProps) {
  const location = useLocation();
  return (
    <React.Fragment>
      <EuiTabs>
        {tabs.map((tab, i) => (
          <EuiTab
            onClick={() => history.push({ ...location, pathname: tab.path })}
            isSelected={isTabSelected(tab, location.pathname)}
            key={`${tab.path}--${i}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer />
      {tabs.map(tab =>
        tab.render ? (
          <Route
            path={tab.routePath || tab.path}
            render={tab.render}
            key={tab.path}
          />
        ) : null
      )}
    </React.Fragment>
  );
}
