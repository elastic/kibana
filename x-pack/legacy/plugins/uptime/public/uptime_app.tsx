/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { BrowserRouter as Router, Route, RouteComponentProps } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';
import { UMBreadcrumb } from './breadcrumbs';
import { UMGraphQLClient, UMUpdateBreadcrumbs, UMUpdateBadge } from './lib/lib';
import { MainPage } from './pages';

export interface UptimeAppColors {
  danger: string;
  success: string;
  range: string;
  mean: string;
  warning: string;
}

export interface UptimeAppProps {
  basePath: string;
  client: UMGraphQLClient;
  darkMode: boolean;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  kibanaBreadcrumbs: UMBreadcrumb[];
  logMonitorPageLoad: () => void;
  logOverviewPageLoad: () => void;
  routerBasename: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  setBadge: UMUpdateBadge;
  renderGlobalHelpControls(): void;
}

const Application = (props: UptimeAppProps) => {
  const { routerBasename } = props;

  return (
    <I18nContext>
      <Router basename={routerBasename}>
        <Route
          path="/"
          render={(rootRouteProps: RouteComponentProps) => (
            <MainPage {...props} rootRouteProps={rootRouteProps} />
          )}
        />
      </Router>
    </I18nContext>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
