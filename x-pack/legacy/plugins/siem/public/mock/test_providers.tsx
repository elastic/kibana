/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { I18nProvider } from '@kbn/i18n/react';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import * as React from 'react';
import { ApolloProvider } from 'react-apollo';
import { DragDropContext, DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { Store } from 'redux';
import { BehaviorSubject } from 'rxjs';
import { ThemeProvider } from 'styled-components';

import { CoreStart } from 'src/core/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

import { createStore, State } from '../store';
import { mockGlobalState } from './global_state';
import { mockUiSettings } from './ui_settings';
import { createKibanaContextProviderMock } from './kibana_react';

jest.mock('ui/new_platform');
jest.mock('../lib/kibana');

const state: State = mockGlobalState;

interface Props {
  children: React.ReactNode;
  store?: Store;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
}

export const apolloClient = new ApolloClient({
  cache: new Cache(),
  link: new ApolloLink((o, f) => (f ? f(o) : null)),
});

export const apolloClientObservable = new BehaviorSubject(apolloClient);

// const services = {
//   uiSettings: mockUiSettings as CoreStart['uiSettings'],
//   savedObjects: {} as CoreStart['savedObjects'],
//   notifications: {} as CoreStart['notifications'],
//   docLinks: {
//     links: {
//       query: {
//         kueryQuerySyntax: '',
//       },
//     },
//   } as CoreStart['docLinks'],
//   http: {} as CoreStart['http'],
//   overlays: {} as CoreStart['overlays'],
//   storage: {
//     get: () => {},
//   },
//   data: {
//     query: {
//       savedQueries: {},
//     },
//   },
// };

const localStorageMock = () => {
  let store: Record<string, unknown> = {};

  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: unknown) => {
      store[key] = value;
    },
    clear() {
      store = {};
    },
  };
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock(),
});

const MockKibanaContextProvider = createKibanaContextProviderMock();

/** A utility for wrapping children in the providers required to run most tests */
export const TestProviders = React.memo<Props>(
  ({ children, store = createStore(state, apolloClientObservable), onDragEnd = jest.fn() }) => (
    <I18nProvider>
      <MockKibanaContextProvider>
        <ApolloProvider client={apolloClient}>
          <ReduxStoreProvider store={store}>
            <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
              <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
            </ThemeProvider>
          </ReduxStoreProvider>
        </ApolloProvider>
      </MockKibanaContextProvider>
    </I18nProvider>
  )
);

export const TestProviderWithoutDragAndDrop = React.memo<Props>(
  ({ children, store = createStore(state, apolloClientObservable) }) => (
    <I18nProvider>
      <ReduxStoreProvider store={store}>{children}</ReduxStoreProvider>
    </I18nProvider>
  )
);
