/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory, History } from 'history';
import React, { memo, useMemo, FC } from 'react';
import { ApolloProvider } from 'react-apollo';
import { Store } from 'redux';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { EuiErrorBoundary } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { I18nContext } from 'ui/i18n';

import { KibanaContextProvider, useUiSetting$ } from '../lib/kibana';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';

import { DEFAULT_DARK_MODE } from '../../common/constants';
import { ErrorToastDispatcher } from '../components/error_toast_dispatcher';
import { compose } from '../lib/compose/kibana_compose';
import { AppFrontendLibs, AppApolloClient } from '../lib/lib';
import { CoreStart, StartPlugins } from '../plugin';
import { PageRouter } from '../routes';
import { createStore } from '../store/store';
import { GlobalToaster, ManageGlobalToaster } from '../components/toasters';
import { MlCapabilitiesProvider } from '../components/ml/permissions/ml_capabilities_provider';

import { ApolloClientContext } from '../utils/apollo_context';

interface AppPluginRootComponentProps {
  apolloClient: AppApolloClient;
  history: History;
  store: Store;
  theme: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const AppPluginRootComponent: React.FC<AppPluginRootComponentProps> = ({
  theme,
  store,
  apolloClient,
  history,
}) => (
  <EuiErrorBoundary>
    <I18nContext>
      <ManageGlobalToaster>
        <ReduxStoreProvider store={store}>
          <ApolloProvider client={apolloClient}>
            <ApolloClientContext.Provider value={apolloClient}>
              <ThemeProvider theme={theme}>
                <MlCapabilitiesProvider>
                  <PageRouter history={history} />
                </MlCapabilitiesProvider>
              </ThemeProvider>
              <ErrorToastDispatcher />
              <GlobalToaster />
            </ApolloClientContext.Provider>
          </ApolloProvider>
        </ReduxStoreProvider>
      </ManageGlobalToaster>
    </I18nContext>
  </EuiErrorBoundary>
);

const AppPluginRoot = memo(AppPluginRootComponent);

const StartAppComponent: FC<AppFrontendLibs> = libs => {
  const history = createHashHistory();
  const libs$ = new BehaviorSubject(libs);
  const store = createStore(undefined, libs$.pipe(pluck('apolloClient')));
  const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);
  const theme = useMemo(
    () => ({
      eui: darkMode ? euiDarkVars : euiLightVars,
      darkMode,
    }),
    [darkMode]
  );

  return (
    <AppPluginRoot store={store} apolloClient={libs.apolloClient} history={history} theme={theme} />
  );
};

const StartApp = memo(StartAppComponent);

interface SiemAppComponentProps {
  core: CoreStart;
  plugins: StartPlugins;
}

const SiemAppComponent: React.FC<SiemAppComponentProps> = ({ core, plugins }) => (
  <KibanaContextProvider
    services={{
      appName: 'siem',
      storage: new Storage(localStorage),
      ...core,
      ...plugins,
    }}
  >
    <StartApp {...compose()} />
  </KibanaContextProvider>
);

export const SiemApp = memo(SiemAppComponent);
