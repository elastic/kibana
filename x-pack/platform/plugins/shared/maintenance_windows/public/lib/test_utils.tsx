/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import type { QueryClient } from '@kbn/react-query';
import {} from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render as reactRender } from '@testing-library/react';
import type { Capabilities, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { ILicense } from '@kbn/licensing-types';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

interface AppMockRendererArgs {
  capabilities?: Capabilities;
  license?: ILicense | null;
}

export interface AppMockRenderer {
  render: UiRender;
  coreStart: CoreStart;
  queryClient: QueryClient;
  AppWrapper: FC<PropsWithChildren<unknown>>;
  mocked: {
    setBadge: jest.Mock;
  };
}

export const createAppMockRenderer = ({
  capabilities,
  license,
}: AppMockRendererArgs = {}): AppMockRenderer => {
  const licensingPluginMock = licensingMock.createStart();

  const { queryClient, provider: TestQueryClientProvider } = createTestResponseOpsQueryClient();

  const mockedSetBadge = jest.fn();
  const core = coreMock.createStart();
  const services = {
    ...core,
    application: {
      ...core.application,
      capabilities: {
        ...core.application.capabilities,
        ...capabilities,
      },
    },
    licensing:
      license != null
        ? { ...licensingPluginMock, license$: new BehaviorSubject(license) }
        : licensingPluginMock,
    chrome: {
      ...core.chrome,
      setBadge: mockedSetBadge,
    },
  };
  const AppWrapper = React.memo<PropsWithChildren>(({ children }) =>
    core.rendering.addContext(
      <KibanaContextProvider services={services}>
        <TestQueryClientProvider>{children}</TestQueryClientProvider>
      </KibanaContextProvider>
    )
  );

  AppWrapper.displayName = 'AppWrapper';

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ...options,
    });
  };

  return {
    coreStart: services,
    render,
    queryClient,
    AppWrapper,
    mocked: {
      setBadge: mockedSetBadge,
    },
  };
};
