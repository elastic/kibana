/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars } from '@kbn/ui-theme';
import { I18nProvider } from '@kbn/i18n-react';

import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { Store } from 'redux';
import { ThemeProvider } from 'styled-components';

import { configureStore } from '@reduxjs/toolkit';
import { createKibanaContextProviderMock } from './kibana_react.mock';
import { timelineReducer } from '../store/timeline/reducer';

interface Props {
  children: React.ReactNode;
  store?: Store;
}

interface State {
  timelineById: Record<string, unknown>;
}

const state: State = {
  timelineById: {
    test: {},
  },
};

window.scrollTo = jest.fn();
const MockKibanaContextProvider = createKibanaContextProviderMock();

/** A utility for wrapping children in the providers required to run most tests */
const TestProvidersComponent: React.FC<Props> = ({
  children,
  store = configureStore({
    preloadedState: state,
    reducer: timelineReducer,
  }),
}) => (
  <I18nProvider>
    <MockKibanaContextProvider>
      <ReduxStoreProvider store={store}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          {children}
        </ThemeProvider>
      </ReduxStoreProvider>
    </MockKibanaContextProvider>
  </I18nProvider>
);

export const TestProviders = React.memo(TestProvidersComponent);
