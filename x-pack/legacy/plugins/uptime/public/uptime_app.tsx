/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPage, EuiErrorBoundary } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { ApolloProvider } from 'react-apollo';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { I18nStart, ChromeBreadcrumb, LegacyCoreStart } from 'src/core/public';
import { PluginsStart } from 'ui/new_platform/new_platform';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { UMGraphQLClient, UMUpdateBreadcrumbs, UMUpdateBadge } from './lib/lib';
import {
  UptimeRefreshContextProvider,
  UptimeSettingsContextProvider,
  UptimeThemeContextProvider,
} from './contexts';
import { CommonlyUsedRange } from './components/functional/uptime_date_picker';
import { store } from './state';
import { setBasePath } from './state/actions';
import { PageRouter } from './routes';

export interface UptimeAppColors {
  danger: string;
  success: string;
  gray: string;
  range: string;
  mean: string;
  warning: string;
}

export interface UptimeAppProps {
  basePath: string;
  canSave: boolean;
  client: UMGraphQLClient;
  core: LegacyCoreStart;
  darkMode: boolean;
  i18n: I18nStart;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  kibanaBreadcrumbs: ChromeBreadcrumb[];
  plugins: PluginsStart;
  routerBasename: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  setBadge: UMUpdateBadge;
  renderGlobalHelpControls(): void;
  commonlyUsedRanges: CommonlyUsedRange[];
}

const Application = (props: UptimeAppProps) => {
  const {
    basePath,
    canSave,
    client,
    core,
    darkMode,
    i18n: i18nCore,
    plugins,
    renderGlobalHelpControls,
    routerBasename,
    setBreadcrumbs,
    setBadge,
  } = props;

  useEffect(() => {
    renderGlobalHelpControls();
    setBadge(
      !canSave
        ? {
            text: i18n.translate('xpack.uptime.badge.readOnly.text', {
              defaultMessage: 'Read only',
            }),
            tooltip: i18n.translate('xpack.uptime.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to save',
            }),
            iconType: 'glasses',
          }
        : undefined
    );
  }, [canSave, renderGlobalHelpControls, setBadge]);

  store.dispatch(setBasePath(basePath));

  return (
    <EuiErrorBoundary>
      <i18nCore.Context>
        <ReduxProvider store={store}>
          <KibanaContextProvider services={{ ...core, ...plugins }}>
            <Router basename={routerBasename}>
              <ApolloProvider client={client}>
                <UptimeRefreshContextProvider>
                  <UptimeSettingsContextProvider {...props}>
                    <UptimeThemeContextProvider darkMode={darkMode}>
                      <EuiPage className="app-wrapper-panel " data-test-subj="uptimeApp">
                        <main>
                          <PageRouter
                            autocomplete={plugins.data.autocomplete}
                            basePath={basePath}
                            setBreadcrumbs={setBreadcrumbs}
                          />
                        </main>
                      </EuiPage>
                    </UptimeThemeContextProvider>
                  </UptimeSettingsContextProvider>
                </UptimeRefreshContextProvider>
              </ApolloProvider>
            </Router>
          </KibanaContextProvider>
        </ReduxProvider>
      </i18nCore.Context>
    </EuiErrorBoundary>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
