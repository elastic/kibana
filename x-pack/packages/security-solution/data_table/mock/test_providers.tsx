/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/module_migration */

import { euiDarkVars } from '@kbn/ui-theme';
import { I18nProvider } from '@kbn/i18n-react';

import React from 'react';
import type { DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import type { Store } from 'redux';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore as createReduxStore } from 'redux';

import type { Action } from '@kbn/ui-actions-plugin/public';
import { CellActionsProvider } from '@kbn/cell-actions';
import { mockGlobalState } from './global_state';
import { localStorageMock } from './mock_local_storage';

interface Props {
  children?: React.ReactNode;
  store?: Store;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
  cellActions?: Action[];
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock(),
});
window.scrollTo = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStore = (state: any) => createReduxStore(() => {}, state);

/** A utility for wrapping children in the providers required to run most tests */
export const TestProvidersComponent: React.FC<Props> = ({
  children,
  store = createStore(mockGlobalState),
  onDragEnd = jest.fn(),
  cellActions = [],
}) => {
  const queryClient = new QueryClient();
  return (
    <I18nProvider>
      <ReduxStoreProvider store={store}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <QueryClientProvider client={queryClient}>
            <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve(cellActions)}>
              <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
            </CellActionsProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ReduxStoreProvider>
    </I18nProvider>
  );
};

/**
 * A utility for wrapping children in the providers required to run most tests
 * WITH user privileges provider.
 */
const TestProvidersWithPrivilegesComponent: React.FC<Props> = ({
  children,
  store = createStore(mockGlobalState),
  onDragEnd = jest.fn(),
  cellActions = [],
}) => (
  <I18nProvider>
    <ReduxStoreProvider store={store}>
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve(cellActions)}>
          <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
        </CellActionsProvider>
      </ThemeProvider>
    </ReduxStoreProvider>
  </I18nProvider>
);

export const TestProviders = React.memo(TestProvidersComponent);
export const TestProvidersWithPrivileges = React.memo(TestProvidersWithPrivilegesComponent);
