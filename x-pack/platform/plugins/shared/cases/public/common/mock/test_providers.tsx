/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import type { ReactElement } from 'react';
import React, { useMemo, useCallback } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { ILicense } from '@kbn/licensing-plugin/public';
import type { FilesClient, ScopedFilesClient } from '@kbn/files-plugin/public';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';
import { QueryClient } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { FilesContext } from '@kbn/shared-ux-file-context';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import type { CoreStart } from '@kbn/core/public';
import type { BaseFilesClient } from '@kbn/shared-ux-file-types';
import type { CasesFeatures, CasesPermissions } from '../../../common/ui/types';
import type { ReleasePhase } from '../../components/types';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import type { CasesContextProps } from '../../components/cases_context';
import { CasesProvider } from '../../components/cases_context';
import { createStartServicesMock } from '../lib/kibana/kibana_react.mock';
import { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import { allCasesPermissions } from './permissions';
import type { CasesPublicStartDependencies } from '../../types';

interface TestProviderProps {
  children: React.ReactNode;
  permissions?: CasesPermissions;
  features?: CasesFeatures;
  owner?: string[];
  releasePhase?: ReleasePhase;
  externalReferenceAttachmentTypeRegistry?: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry?: PersistableStateAttachmentTypeRegistry;
  license?: ILicense;
  services?: CasesPublicStartDependencies;
  queryClient?: QueryClient;
  coreStart?: CoreStart;
  filesClient?: BaseFilesClient;
}

window.scrollTo = jest.fn();

const getMockedFilesClient = (): BaseFilesClient => {
  const mockedFilesClient = createMockFilesClient();
  mockedFilesClient.getFileKind.mockImplementation(() => ({
    id: 'test',
    maxSizeBytes: 10000,
    http: {},
  }));

  return mockedFilesClient;
};

export const mockedTestProvidersOwner = [SECURITY_SOLUTION_OWNER];

export const createTestQueryClient = () =>
  new QueryClient({
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

/** A utility for wrapping children in the providers required to run most tests */
const TestProvidersComponent: React.FC<TestProviderProps> = ({
  children,
  features,
  owner,
  permissions,
  releasePhase,
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  license,
  coreStart,
  services,
  queryClient,
  filesClient,
}) => {
  const finalCoreStart = useMemo(() => coreStart ?? coreMock.createStart(), [coreStart]);
  const finalServices = useMemo(
    () => ({ ...createStartServicesMock({ license }), ...coreStart, ...services }),
    [coreStart, license, services]
  );

  const defaultQueryClient = useMemo(() => createTestQueryClient(), []);

  const finalQueryClient = useMemo(
    () => queryClient ?? defaultQueryClient,
    [defaultQueryClient, queryClient]
  );

  const defaultPermissions = useMemo(() => allCasesPermissions(), []);
  const finalFilesClient = useMemo(
    () => filesClient ?? getMockedFilesClient(),
    [filesClient]
  ) as FilesClient;

  const getFilesClientFinal = useCallback(
    () => finalFilesClient as unknown as ScopedFilesClient,
    [finalFilesClient]
  );

  const defaultExternalReferenceAttachmentTypeRegistry = useMemo(
    () => new ExternalReferenceAttachmentTypeRegistry(),
    []
  );

  const defaultPersistableStateAttachmentTypeRegistry = useMemo(
    () => new PersistableStateAttachmentTypeRegistry(),
    []
  );

  const casesProviderValue: CasesContextProps = useMemo(
    () => ({
      externalReferenceAttachmentTypeRegistry:
        externalReferenceAttachmentTypeRegistry ?? defaultExternalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry:
        persistableStateAttachmentTypeRegistry ?? defaultPersistableStateAttachmentTypeRegistry,
      features,
      owner: owner ?? mockedTestProvidersOwner,
      permissions: permissions ?? defaultPermissions,
      releasePhase: releasePhase ?? 'ga',
      getFilesClient: getFilesClientFinal,
    }),
    [
      defaultExternalReferenceAttachmentTypeRegistry,
      defaultPermissions,
      defaultPersistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry,
      features,
      getFilesClientFinal,
      owner,
      permissions,
      persistableStateAttachmentTypeRegistry,
      releasePhase,
    ]
  );

  return (
    <KibanaRenderContextProvider {...finalCoreStart}>
      <KibanaContextProvider services={finalServices}>
        <MemoryRouter>
          <CasesProvider value={casesProviderValue} queryClient={finalQueryClient}>
            <FilesContext client={finalFilesClient}>{children}</FilesContext>
          </CasesProvider>
        </MemoryRouter>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

TestProvidersComponent.displayName = 'TestProviders';

export const TestProviders = React.memo(TestProvidersComponent);

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  wrapperProps?: Omit<TestProviderProps, 'children'>;
};

export const renderWithTestingProviders = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { wrapperProps, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: (props) => <TestProviders {...props} {...wrapperProps} />,
    ...renderOptions,
  });
};
