/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory } from 'history';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';

// TODO use theme provided from parentApp when kibana supports it
import { EuiErrorBoundary } from '@elastic/eui';
import { UICapabilitiesProvider } from 'ui/capabilities/react';
import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
import { EuiThemeProvider } from '../../../../common/eui_styled_components';
import { InfraFrontendLibs } from '../lib/lib';
import { PageRouter } from '../routes';
import { createStore } from '../store';
import { ApolloClientContext } from '../utils/apollo_context';
import { ReduxStateContextProvider } from '../utils/redux_context';
import { HistoryContext } from '../utils/history_context';
import {
  useUiSetting$,
  KibanaContextProvider,
} from '../../../../../../src/plugins/kibana_react/public';

const { uiSettings } = npStart.core;

export async function startApp(libs: InfraFrontendLibs) {
  const history = createHashHistory();

  const libs$ = new BehaviorSubject(libs);
  const store = createStore({
    apolloClient: libs$.pipe(pluck('apolloClient')),
    observableApi: libs$.pipe(pluck('observableApi')),
  });

  const InfraPluginRoot: React.FunctionComponent = () => {
    const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

    return (
      <I18nContext>
        <UICapabilitiesProvider>
          <EuiErrorBoundary>
            <ReduxStoreProvider store={store}>
              <ReduxStateContextProvider>
                <ApolloProvider client={libs.apolloClient}>
                  <ApolloClientContext.Provider value={libs.apolloClient}>
                    <EuiThemeProvider darkMode={darkMode}>
                      <HistoryContext.Provider value={history}>
                        <PageRouter history={history} />
                      </HistoryContext.Provider>
                    </EuiThemeProvider>
                  </ApolloClientContext.Provider>
                </ApolloProvider>
              </ReduxStateContextProvider>
            </ReduxStoreProvider>
          </EuiErrorBoundary>
        </UICapabilitiesProvider>
      </I18nContext>
    );
  };

  libs.framework.render(
    <KibanaContextProvider services={{ uiSettings }}>
      <InfraPluginRoot />
    </KibanaContextProvider>
  );
}
