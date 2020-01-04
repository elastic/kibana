/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { createHashHistory } from 'history';
import React, { memo, FC } from 'react';
import { ApolloProvider } from 'react-apollo';
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
import { AppFrontendLibs } from '../lib/lib';
import { StartCore, StartPlugins } from './plugin';
import { PageRouter } from '../routes';
import { createStore } from '../store';
import { GlobalToaster, ManageGlobalToaster } from '../components/toasters';
import { MlCapabilitiesProvider } from '../components/ml/permissions/ml_capabilities_provider';

import { ApolloClientContext } from '../utils/apollo_context';

const StartApp: FC<AppFrontendLibs> = memo(libs => {
  const history = createHashHistory();

  const libs$ = new BehaviorSubject(libs);

  const store = createStore(undefined, libs$.pipe(pluck('apolloClient')));

  const AppPluginRoot = memo(() => {
    const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);
    return (
      <EuiErrorBoundary>
        <I18nContext>
          <ManageGlobalToaster>
            <ReduxStoreProvider store={store}>
              <ApolloProvider client={libs.apolloClient}>
                <ApolloClientContext.Provider value={libs.apolloClient}>
                  <ThemeProvider
                    theme={() => ({
                      eui: darkMode ? euiDarkVars : euiLightVars,
                      darkMode,
                    })}
                  >
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
  });
  return <AppPluginRoot />;
});

export const ROOT_ELEMENT_ID = 'react-siem-root';

export const SiemApp = memo<{ core: StartCore; plugins: StartPlugins }>(({ core, plugins }) => (
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
));
