/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { CreateConnectorFlyoutProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/action_connector_form/create_connector_flyout';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useCreateConnectorFlyout } from './use_create_connector_flyout';

type AddConnectorFlyoutParams = Omit<CreateConnectorFlyoutProps, 'actionTypeRegistry'>;

let capturedFlyoutProps: AddConnectorFlyoutParams | undefined;

const mockGetAddConnectorFlyout = jest.fn((props: AddConnectorFlyoutParams) => {
  capturedFlyoutProps = props;
  return <div data-test-subj="contextCreateConnectorFlyoutStub" />;
});

interface ConnectorCapabilities {
  canSave?: boolean;
  canShow?: boolean;
}

type ContextEngineServices = CoreStart & {
  triggersActionsUi: { getAddConnectorFlyout: typeof mockGetAddConnectorFlyout };
};

const createServices = ({ canSave = true, canShow = true }: ConnectorCapabilities = {}) => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    actions: {
      ...core.application.capabilities.actions,
      save: canSave,
      show: canShow,
    },
  };
  return {
    ...core,
    triggersActionsUi: { getAddConnectorFlyout: mockGetAddConnectorFlyout },
  } satisfies ContextEngineServices;
};

const renderUseCreateConnectorFlyout = (
  onConnectorCreated = jest.fn(),
  services: ContextEngineServices = createServices()
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return {
    ...renderHook(() => useCreateConnectorFlyout({ onConnectorCreated }), { wrapper }),
    queryClient,
    onConnectorCreated,
    services,
  };
};

describe('useCreateConnectorFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = undefined;
  });

  it('opens the create connector flyout', () => {
    const { result } = renderUseCreateConnectorFlyout();

    expect(result.current.createConnectorFlyout).toBeNull();

    act(() => {
      result.current.openCreateFlyout();
    });

    expect(mockGetAddConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: ContextEngineConnectorFeatureId,
        size: 'm',
      })
    );
    expect(result.current.createConnectorFlyout).not.toBeNull();
  });

  it('notifies the host with the new connector checked when a connector is created', () => {
    const onConnectorCreated = jest.fn();
    const { result } = renderUseCreateConnectorFlyout(onConnectorCreated);

    act(() => {
      result.current.openCreateFlyout();
    });

    const connector = createMockActionConnector({ id: 'new-connector', name: 'Jira Cloud' });

    act(() => {
      capturedFlyoutProps?.onConnectorCreated?.(connector);
    });

    expect(onConnectorCreated).toHaveBeenCalledWith({
      id: 'new-connector',
      name: 'Jira Cloud',
      checked: true,
    });
  });

  it('invalidates connector list queries when a connector is created', () => {
    const { result, queryClient } = renderUseCreateConnectorFlyout();

    act(() => {
      result.current.openCreateFlyout();
    });

    const connector = createMockActionConnector({ id: 'new-connector', name: 'Jira Cloud' });

    act(() => {
      capturedFlyoutProps?.onConnectorCreated?.(connector);
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.connectors.list(),
    });
  });

  it('invalidates connector list queries and closes the flyout when it is dismissed', () => {
    const { result, queryClient } = renderUseCreateConnectorFlyout();

    act(() => {
      result.current.openCreateFlyout();
    });

    act(() => {
      capturedFlyoutProps?.onClose();
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.connectors.list(),
    });
    expect(result.current.createConnectorFlyout).toBeNull();
  });

  it('exposes the create and read capabilities', () => {
    const { result: cannotCreate } = renderUseCreateConnectorFlyout(
      jest.fn(),
      createServices({ canSave: false })
    );
    expect(cannotCreate.current.canCreateConnector).toBe(false);

    const { result: cannotRead } = renderUseCreateConnectorFlyout(
      jest.fn(),
      createServices({ canShow: false })
    );
    expect(cannotRead.current.canReadConnectors).toBe(false);

    const { result: canDoBoth } = renderUseCreateConnectorFlyout();
    expect(canDoBoth.current.canCreateConnector).toBe(true);
    expect(canDoBoth.current.canReadConnectors).toBe(true);
  });
});
