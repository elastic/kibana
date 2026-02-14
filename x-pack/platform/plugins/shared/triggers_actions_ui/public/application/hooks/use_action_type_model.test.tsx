/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { useKibana } from '../../common/lib/kibana';
import { useActionTypeModel } from './use_action_type_model';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import type { ActionType, ActionTypeModel } from '../../types';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useActionTypeModel', () => {
  let actionTypeRegistry: ReturnType<typeof actionTypeRegistryMock.create>;
  let queryClient: QueryClient;

  const mockActionTypeModel: ActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    id: 'test-connector',
  });

  const mockSpecResponse = {
    metadata: {
      id: 'spec-connector',
      displayName: 'Spec Connector',
      description: 'A spec-based connector',
      minimumLicense: 'basic',
      supportedFeatureIds: ['alerting'],
    },
    schema: {
      type: 'object',
      properties: {
        config: { type: 'object', properties: {} },
        secrets: { type: 'object', properties: {} },
      },
    },
  };

  const createWrapper = (): FC<PropsWithChildren<unknown>> => {
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    actionTypeRegistry = actionTypeRegistryMock.create();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('returns null when actionType is null', async () => {
    const { result } = renderHook(
      () => useActionTypeModel(actionTypeRegistry, null),
      { wrapper: createWrapper() }
    );

    expect(result.current).toEqual({
      actionTypeModel: null,
      isLoading: false,
      error: null,
      isFromSpec: false,
    });
  });

  it('returns registered model synchronously for stack connectors', async () => {
    const stackActionType: ActionType = {
      id: 'test-connector',
      name: 'Test Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
    };

    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(mockActionTypeModel);

    const { result } = renderHook(
      () => useActionTypeModel(actionTypeRegistry, stackActionType),
      { wrapper: createWrapper() }
    );

    // Should return immediately without loading
    expect(result.current.actionTypeModel).toBe(mockActionTypeModel);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isFromSpec).toBe(false);

    // Should not call HTTP get for registered connectors
    expect(useKibanaMock().services.http.get).not.toHaveBeenCalled();
  });

  it('fetches spec from API for spec-based connectors not in registry', async () => {
    const specActionType: ActionType = {
      id: 'spec-connector',
      name: 'Spec Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue(mockSpecResponse);

    const { result } = renderHook(
      () => useActionTypeModel(actionTypeRegistry, specActionType),
      { wrapper: createWrapper() }
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.actionTypeModel).toBeNull();

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify API was called
    expect(useKibanaMock().services.http.get).toHaveBeenCalledWith(
      '/internal/actions/connector_types/spec-connector/spec',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    // Verify model is returned
    expect(result.current.actionTypeModel).not.toBeNull();
    expect(result.current.actionTypeModel?.id).toBe('spec-connector');
    expect(result.current.isFromSpec).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns loading state while fetching spec', async () => {
    const specActionType: ActionType = {
      id: 'spec-connector',
      name: 'Spec Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);

    // Create a promise that won't resolve immediately
    let resolvePromise: (value: typeof mockSpecResponse) => void;
    const promise = new Promise<typeof mockSpecResponse>((resolve) => {
      resolvePromise = resolve;
    });
    useKibanaMock().services.http.get = jest.fn().mockReturnValue(promise);

    const { result } = renderHook(
      () => useActionTypeModel(actionTypeRegistry, specActionType),
      { wrapper: createWrapper() }
    );

    // Should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.actionTypeModel).toBeNull();
    expect(result.current.isFromSpec).toBe(false);

    // Resolve the promise
    resolvePromise!(mockSpecResponse);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.actionTypeModel).not.toBeNull();
      expect(result.current.isFromSpec).toBe(true);
    });
  });

  it('handles fetch errors correctly', async () => {
    const specActionType: ActionType = {
      id: 'spec-connector',
      name: 'Spec Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    const fetchError = new Error('Failed to fetch spec');
    useKibanaMock().services.http.get = jest.fn().mockRejectedValue(fetchError);

    const { result } = renderHook(
      () => useActionTypeModel(actionTypeRegistry, specActionType),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(fetchError);
    expect(result.current.actionTypeModel).toBeNull();
    expect(result.current.isFromSpec).toBe(false);
  });

  it('caches spec data and does not refetch on subsequent calls', async () => {
    const specActionType: ActionType = {
      id: 'spec-connector',
      name: 'Spec Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue(mockSpecResponse);

    // First render
    const { result, rerender } = renderHook(
      () => useActionTypeModel(actionTypeRegistry, specActionType),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(useKibanaMock().services.http.get).toHaveBeenCalledTimes(1);

    // Rerender (simulate component re-render)
    rerender();

    // Should still have the cached data, no new fetch
    expect(result.current.actionTypeModel).not.toBeNull();
    expect(useKibanaMock().services.http.get).toHaveBeenCalledTimes(1);
  });

  it('does not fetch for non-spec connectors not in registry', async () => {
    const unknownActionType: ActionType = {
      id: 'unknown-connector',
      name: 'Unknown Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      // No source field - not a spec connector
    };

    actionTypeRegistry.has.mockReturnValue(false);

    const { result } = renderHook(
      () => useActionTypeModel(actionTypeRegistry, unknownActionType),
      { wrapper: createWrapper() }
    );

    // Should not be loading (no fetch triggered)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.actionTypeModel).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isFromSpec).toBe(false);

    // Should not call HTTP get for non-spec connectors
    expect(useKibanaMock().services.http.get).not.toHaveBeenCalled();
  });

  it('transforms spec response into ActionTypeModel with correct properties', async () => {
    const specActionType: ActionType = {
      id: 'spec-connector',
      name: 'Spec Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue(mockSpecResponse);

    const { result } = renderHook(
      () => useActionTypeModel(actionTypeRegistry, specActionType),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const model = result.current.actionTypeModel;
    expect(model).not.toBeNull();
    expect(model?.id).toBe('spec-connector');
    expect(model?.actionTypeTitle).toBe('Spec Connector');
    expect(model?.selectMessage).toBe('A spec-based connector');
    expect(model?.source).toBe(ACTION_TYPE_SOURCES.spec);
    expect(model?.isExperimental).toBe(false);
    expect(model?.actionConnectorFields).toBeDefined();
    expect(model?.actionParamsFields).toBeDefined();
    expect(model?.validateParams).toBeDefined();
  });
});
