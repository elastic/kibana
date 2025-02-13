/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React, { useMemo } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as reactRender, waitFor } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ILicense } from '@kbn/licensing-plugin/public';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';
import { QueryClient } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { FilesContext } from '@kbn/shared-ux-file-context';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import type { CasesFeatures, CasesPermissions } from '../../../common/ui/types';
import type { StartServices } from '../../types';
import type { ReleasePhase } from '../../components/types';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { CasesProvider } from '../../components/cases_context';
import { createStartServicesMock } from '../lib/kibana/kibana_react.mock';
import { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import { allCasesPermissions } from './permissions';

interface TestProviderProps {
  children: React.ReactNode;
  permissions?: CasesPermissions;
  features?: CasesFeatures;
  owner?: string[];
  releasePhase?: ReleasePhase;
  externalReferenceAttachmentTypeRegistry?: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry?: PersistableStateAttachmentTypeRegistry;
  license?: ILicense;
}
type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

window.scrollTo = jest.fn();

const mockGetFilesClient = () => {
  const mockedFilesClient = createMockFilesClient() as unknown as DeeplyMockedKeys<
    ScopedFilesClient<unknown>
  >;

  mockedFilesClient.getFileKind.mockImplementation(() => ({
    id: 'test',
    maxSizeBytes: 10000,
    http: {},
  }));

  return () => mockedFilesClient;
};

export const mockedTestProvidersOwner = [SECURITY_SOLUTION_OWNER];

/** A utility for wrapping children in the providers required to run most tests */
const TestProvidersComponent: React.FC<TestProviderProps> = ({
  children,
  features,
  owner = mockedTestProvidersOwner,
  permissions = allCasesPermissions(),
  releasePhase = 'ga',
  externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry(),
  persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry(),
  license,
}) => {
  const coreStart = useMemo(() => coreMock.createStart(), []);
  const services = useMemo(() => createStartServicesMock({ license }), [license]);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  const getFilesClient = mockGetFilesClient();
  const casesProviderValue = {
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    features,
    owner,
    permissions,
    getFilesClient,
  };

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={services}>
        <MemoryRouter>
          <CasesProvider value={casesProviderValue} queryClient={queryClient}>
            <FilesContext client={createMockFilesClient()}>{children}</FilesContext>
          </CasesProvider>
        </MemoryRouter>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};
TestProvidersComponent.displayName = 'TestProviders';

export const TestProviders = React.memo(TestProvidersComponent);

export interface AppMockRenderer {
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  render: UiRender;
  coreStart: StartServices;
  queryClient: QueryClient;
  AppWrapper: React.FC<{ children: React.ReactNode }>;
  getFilesClient: () => ScopedFilesClient;
  clearQueryCache: () => Promise<void>;
}

export const createAppMockRenderer = ({
  features,
  owner = mockedTestProvidersOwner,
  permissions = allCasesPermissions(),
  releasePhase = 'ga',
  externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry(),
  persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry(),
  license,
}: Omit<TestProviderProps, 'children'> = {}): AppMockRenderer => {
  const coreStart = coreMock.createStart();
  const services = createStartServicesMock({ license });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  const getFilesClient = mockGetFilesClient();
  const casesProviderValue = {
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    features,
    owner,
    permissions,
    releasePhase,
    getFilesClient,
  };
  const AppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={services}>
        <MemoryRouter>
          <CasesProvider value={casesProviderValue} queryClient={queryClient}>
            {children}
          </CasesProvider>
        </MemoryRouter>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );

  AppWrapper.displayName = 'AppWrapper';
  const memoizedAppWrapper = React.memo(AppWrapper);

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: memoizedAppWrapper,
      ...options,
    });
  };

  const clearQueryCache = async () => {
    queryClient.getQueryCache().clear();

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  };

  return {
    coreStart: services,
    queryClient,
    render,
    AppWrapper,
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    getFilesClient,
    clearQueryCache,
  };
};
