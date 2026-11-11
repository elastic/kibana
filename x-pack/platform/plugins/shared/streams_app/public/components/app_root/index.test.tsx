/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { StreamsAppStartDependencies } from '../../types';
import type { StreamsAppServices } from '../../services/types';
import { CLASSIC_TAB_ORIGIN_KEY } from '../../hooks/use_streams_home_link';
import { useShowClassicTab } from '../streams_layout/use_show_classic_tab';
import { AppRoot } from '.';

const mockFetch = jest.fn();

const MockClassicTabProbe = () => {
  const { loading, showClassic } = useShowClassicTab();
  return <div data-test-subj="classicTabProbe">{`${loading}-${showClassic}`}</div>;
};

const passThrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;

jest.mock('@kbn/typed-react-router-config', () => ({
  RouterProvider: passThrough,
  BreadcrumbsContextProvider: passThrough,
  RouteRenderer: () => <MockClassicTabProbe />,
}));
jest.mock('@kbn/ebt-tools', () => ({ PerformanceContextProvider: passThrough }));
jest.mock('../streams_app_context_provider', () => ({ StreamsAppContextProvider: passThrough }));
jest.mock('../../routes/config', () => ({ streamsAppRouter: {} }));
jest.mock('../../util/kbn_url_state_context', () => ({
  KbnUrlStateStorageFromRouterProvider: passThrough,
}));
jest.mock('../date_range_redirect', () => ({ DateRangeRedirect: passThrough }));
jest.mock('./update_execution_context_on_route_change', () => ({
  UpdateExecutionContextOnRouteChange: passThrough,
}));
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: { start: { streams: { streamsRepositoryClient: { fetch: mockFetch } } } },
  }),
}));
jest.mock('../../hooks/use_streams_privileges', () => ({
  useStreamsPrivileges: () => ({ access: { legacy: true, v2: true } }),
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
  it('runs the stream check again when the app mounts again', async () => {
    mockFetch.mockResolvedValue({ streams: [] });
    const firstMount = renderAppRoot();
    await waitFor(() =>
      expect(screen.getByTestId('classicTabProbe')).toHaveTextContent('false-false')
    );
    firstMount.unmount();

    mockFetch.mockResolvedValue({ streams: [{ name: 'logs-nginx-default', type: 'classic' }] });
    renderAppRoot();

    await waitFor(() =>
      expect(screen.getByTestId('classicTabProbe')).toHaveTextContent('false-true')
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('forgets the Classic tab origin when the app unmounts', () => {
    sessionStorage.setItem(CLASSIC_TAB_ORIGIN_KEY, 'edge');
    const view = renderAppRoot();

    view.unmount();

    expect(sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY)).toBeNull();
  });
});
