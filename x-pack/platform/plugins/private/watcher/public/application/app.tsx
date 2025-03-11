/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Observable } from 'rxjs';
import {
  DocLinksStart,
  HttpSetup,
  ToastsSetup,
  IUiSettingsClient,
  ApplicationStart,
  ExecutionContextStart,
  ThemeServiceStart,
  I18nStart,
  UserProfileService,
} from '@kbn/core/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';

import { Redirect, withRouter, RouteComponentProps } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';

import { RegisterManagementAppArgs, ManagementAppMountParams } from '@kbn/management-plugin/public';

import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { LicenseManagementLocator } from '@kbn/license-management-plugin/public/locator';
import { LicenseStatus } from '../../common/types/license_status';
import { WatchListPage, WatchEditPage, WatchStatusPage } from './sections';
import { registerRouter } from './lib/navigation';
import { AppContextProvider } from './app_context';
import { LicensePrompt } from './license_prompt';

const ShareRouter = withRouter(({ children, history }: RouteComponentProps & { children: any }) => {
  registerRouter({ history });
  return children;
});

export interface AppDeps {
  docLinks: DocLinksStart;
  toasts: ToastsSetup;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  chartsTheme: ChartsPluginSetup['theme'];
  createTimeBuckets: () => any;
  licenseStatus$: Observable<LicenseStatus>;
  setBreadcrumbs: Parameters<RegisterManagementAppArgs['mount']>[0]['setBreadcrumbs'];
  history: ManagementAppMountParams['history'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
  executionContext: ExecutionContextStart;
  licenseManagementLocator?: LicenseManagementLocator;
  settings: SettingsStart;
}

export const App = (deps: AppDeps) => {
  const [{ valid, message }, setLicenseStatus] = useState<LicenseStatus>({ valid: true });

  useEffect(() => {
    const s = deps.licenseStatus$.subscribe(setLicenseStatus);
    return () => s.unsubscribe();
  }, [deps.licenseStatus$]);

  if (!valid) {
    return (
      <LicensePrompt licenseManagementLocator={deps.licenseManagementLocator} message={message} />
    );
  }
  return (
    <Router history={deps.history}>
      <ShareRouter>
        <AppContextProvider value={deps}>
          <AppWithoutRouter />
        </AppContextProvider>
      </ShareRouter>
    </Router>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Routes>
    <Route exact path="/watches" component={WatchListPage} />
    <Route exact path="/watches/watch/:id/status" component={WatchStatusPage} />
    <Route exact path="/watches/watch/:id/edit" component={WatchEditPage} />
    <Route exact path="/watches/new-watch/:type(json|threshold)" component={WatchEditPage} />
    <Redirect exact from="/" to="/watches" />
    <Redirect exact from="" to="/watches" />
  </Routes>
);
