/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren, ReactElement } from 'react';
import { ReactWrapper } from 'enzyme';
import { Provider } from 'react-redux';
import { PreloadedState } from '@reduxjs/toolkit';
import { RenderOptions } from '@testing-library/react';
import { LensAppServices } from '../app_plugin/types';
import { mountWithProviders, renderWithProviders } from '../test_utils/test_utils';
import { makeConfigureStore, LensAppState, LensState, LensStoreDeps } from '../state_management';
import { getResolvedDateRange } from '../utils';
import { DatasourceMap, VisualizationMap } from '../types';
import { mockVisualizationMap } from './visualization_mock';
import { mockDatasourceMap } from './datasource_mock';
import { makeDefaultServices } from './services_mock';

export const mockStoreDeps = ({
  lensServices = makeDefaultServices(),
  datasourceMap = mockDatasourceMap(),
  visualizationMap = mockVisualizationMap(),
}: {
  lensServices?: LensAppServices;
  datasourceMap?: DatasourceMap;
  visualizationMap?: VisualizationMap;
} = {}) => ({
  datasourceMap,
  visualizationMap,
  lensServices,
});

export function mockDatasourceStates() {
  return {
    testDatasource: {
      state: {},
      isLoading: false,
    },
  };
}

export const defaultState = {
  searchSessionId: 'sessionId-1',
  filters: [],
  query: { language: 'lucene', query: '' },
  resolvedDateRange: { fromDate: 'now-7d', toDate: 'now' },
  isFullscreenDatasource: false,
  isSaveable: false,
  isLoading: false,
  isLinkedToOriginatingApp: false,
  activeDatasourceId: 'testDatasource',
  visualization: {
    state: {},
    activeId: 'testVis',
  },
  datasourceStates: mockDatasourceStates(),
  dataViews: {
    indexPatterns: {},
    indexPatternRefs: [],
  },
};

export const renderWithReduxStore = (
  ui: ReactElement,
  renderOptions?: RenderOptions,
  {
    preloadedState,
    storeDeps,
  }: { preloadedState?: Partial<LensAppState>; storeDeps?: LensStoreDeps } = {
    preloadedState: {},
    storeDeps: mockStoreDeps(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const { store } = makeLensStore({ preloadedState, storeDeps });
  const { wrapper, ...options } = renderOptions || {};

  const CustomWrapper = wrapper as React.ComponentType<React.PropsWithChildren<{}>>;

  const Wrapper: React.FC<PropsWithChildren<{}>> = ({ children }) => (
    <Provider store={store}>
      {wrapper ? <CustomWrapper>{children}</CustomWrapper> : children}
    </Provider>
  );

  const rtlRender = renderWithProviders(ui, { wrapper: Wrapper, ...options });

  return {
    store,
    ...rtlRender,
  };
};

export function makeLensStore({
  preloadedState,
  storeDeps = mockStoreDeps(),
}: {
  storeDeps?: LensStoreDeps;
  preloadedState?: Partial<LensAppState>;
} = {}) {
  const data = storeDeps.lensServices.data;
  const store = makeConfigureStore(storeDeps, {
    lens: {
      ...defaultState,
      query: data.query.queryString.getQuery(),
      filters: data.query.filterManager.getGlobalFilters(),
      resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
      ...preloadedState,
    },
  } as unknown as PreloadedState<LensState>);

  store.dispatch = jest.spyOn(store, 'dispatch') as jest.Mock;
  return { store, deps: storeDeps };
}

export interface MountStoreProps {
  storeDeps?: LensStoreDeps;
  preloadedState?: Partial<LensAppState>;
}

// legacy enzyme usage: remove when all tests are migrated to @testing-library/react
export const mountWithReduxStore = (
  component: React.ReactElement,
  store?: MountStoreProps,
  options?: {
    wrappingComponent?: React.FC<PropsWithChildren<{}>>;
    wrappingComponentProps?: Record<string, unknown>;
    attachTo?: HTMLElement;
  }
) => {
  const { store: lensStore, deps } = makeLensStore(store);

  let wrappingComponent: React.FC<PropsWithChildren<{}>> = ({ children }) => (
    <Provider store={lensStore}>{children}</Provider>
  );
  if (options?.wrappingComponent) {
    wrappingComponent = ({ children }) => {
      return options?.wrappingComponent?.({
        ...options?.wrappingComponentProps,
        children: wrappingComponent({ children }),
      });
    };
  }

  const instance = mountWithProviders(component, {
    ...options,
    wrappingComponent,
  } as unknown as ReactWrapper);

  return { instance, lensStore, deps };
};
