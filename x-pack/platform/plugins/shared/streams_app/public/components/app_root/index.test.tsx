/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { StreamsAppStartDependencies } from '../../types';
import type { StreamsAppServices } from '../../services/types';
import { CLASSIC_TAB_ORIGIN_KEY } from '../../hooks/use_streams_home_link';
import { AppRoot } from '.';

const passThrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;

jest.mock('@kbn/typed-react-router-config', () => ({
  RouterProvider: passThrough,
  BreadcrumbsContextProvider: passThrough,
  RouteRenderer: () => null,
}));
jest.mock('@kbn/ebt-tools/react', () => ({ PerformanceContextProvider: passThrough }));
jest.mock('../streams_app_context_provider', () => ({ StreamsAppContextProvider: passThrough }));
jest.mock('../../routes/config', () => ({ streamsAppRouter: {} }));
jest.mock('../../util/kbn_url_state_context', () => ({
  KbnUrlStateStorageFromRouterProvider: passThrough,
}));
jest.mock('../date_range_redirect', () => ({ DateRangeRedirect: passThrough }));
jest.mock('./update_execution_context_on_route_change', () => ({
  UpdateExecutionContextOnRouteChange: passThrough,
}));

const renderAppRoot = () =>
  render(
    <AppRoot
      coreStart={{} as CoreStart}
      pluginsStart={{} as StreamsAppStartDependencies}
      services={{} as StreamsAppServices}
      isServerless={false}
      appMountParameters={{} as AppMountParameters}
    />
  );

describe('AppRoot', () => {
  it('forgets the Classic tab origin when the app unmounts', () => {
    sessionStorage.setItem(CLASSIC_TAB_ORIGIN_KEY, 'edge');
    const view = renderAppRoot();

    view.unmount();

    expect(sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY)).toBeNull();
  });
});
