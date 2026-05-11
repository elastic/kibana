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
import { connectorsSpecs, serializeConnectorSpec } from '@kbn/connector-specs';
import { useActionTypeModel } from '@kbn/alerts-ui-shared';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import type { ActionType, ActionTypeModel } from '../../types';

const WORKFLOWS_CONNECTOR_FEATURE_ID = 'workflows';

describe('useActionTypeModel', () => {
  let actionTypeRegistry: ReturnType<typeof actionTypeRegistryMock.create>;
  let queryClient: QueryClient;
  let mockHttp: { get: jest.Mock };
  let mockUiSettings: { get: jest.Mock };

  const mockActionTypeModel: ActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    id: 'test-connector',
  });

  const mockSpecResponse = {
    metadata: {
      id: 'spec-connector',
      display_name: 'Spec Connector',
      description: 'A spec-based connector',
      minimum_license: 'basic',
      supported_feature_ids: ['alerting'],
    },
    schema: serializeConnectorSpec(connectorsSpecs.AlienVaultOTXConnector).schema as Record<
      string,
      unknown
    >,
  };

  const createWrapper = (): FC<PropsWithChildren<unknown>> => {
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = { get: jest.fn() };
    mockUiSettings = { get: jest.fn().mockReturnValue(true) };
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
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: null,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toEqual({
      actionTypeModel: null,
      isLoading: false,
      error: null,
      isFromSpec: false,
      refetch: expect.any(Function),
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
      isSystemActionType: false,
      isDeprecated: false,
    };

    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(mockActionTypeModel);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: stackActionType,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    // Should return immediately without loading
    expect(result.current.actionTypeModel).toBe(mockActionTypeModel);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isFromSpec).toBe(false);

    // Should not call HTTP get for registered connectors
    expect(mockHttp.get).not.toHaveBeenCalled();
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
      isSystemActionType: false,
      isDeprecated: false,
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    mockHttp.get.mockResolvedValue(mockSpecResponse);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: specActionType,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
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
    expect(mockHttp.get).toHaveBeenCalledWith(
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
      isSystemActionType: false,
      isDeprecated: false,
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);

    // Create a promise that won't resolve immediately
    let resolvePromise: (value: typeof mockSpecResponse) => void;
    const promise = new Promise<typeof mockSpecResponse>((resolve) => {
      resolvePromise = resolve;
    });
    mockHttp.get.mockReturnValue(promise);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: specActionType,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
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

  it('surfaces error when connector spec schema cannot be parsed', async () => {
    const specActionType: ActionType = {
      id: 'spec-connector',
      name: 'Spec Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      isSystemActionType: false,
      isDeprecated: false,
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    mockHttp.get.mockResolvedValue({
      ...mockSpecResponse,
      schema: {
        type: 'object',
        properties: {
          config: { type: 'object', properties: {} },
          secrets: { type: 'string' },
        },
      },
    });

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: specActionType,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(
      'Failed to parse connector spec schema for "spec-connector"'
    );
    expect(result.current.actionTypeModel).toBeNull();
    expect(result.current.isFromSpec).toBe(false);
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
      isSystemActionType: false,
      isDeprecated: false,
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    const fetchError = new Error('Failed to fetch spec');
    mockHttp.get.mockRejectedValue(fetchError);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: specActionType,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
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
      isSystemActionType: false,
      isDeprecated: false,
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    mockHttp.get.mockResolvedValue(mockSpecResponse);

    // First render
    const { result, rerender } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: specActionType,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);

    // Rerender (simulate component re-render)
    rerender();

    // Should still have the cached data, no new fetch
    expect(result.current.actionTypeModel).not.toBeNull();
    expect(mockHttp.get).toHaveBeenCalledTimes(1);
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
      isSystemActionType: false,
      isDeprecated: false,
      // No source field - not a spec connector
    };

    actionTypeRegistry.has.mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: unknownActionType,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    // Should not be loading (no fetch triggered)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.actionTypeModel).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isFromSpec).toBe(false);

    // Should not call HTTP get for non-spec connectors
    expect(mockHttp.get).not.toHaveBeenCalled();
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
      isSystemActionType: false,
      isDeprecated: false,
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);
    mockHttp.get.mockResolvedValue(mockSpecResponse);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: specActionType,
          http: mockHttp as any,
          uiSettings: mockUiSettings as any,
        }),
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

  it('exposes getHideInUi on fetched spec model using uiSettings for workflows-only connectors', async () => {
    const workflowsSpecResponse = {
      ...mockSpecResponse,
      metadata: {
        ...mockSpecResponse.metadata,
        id: 'workflows-spec-connector',
        supported_feature_ids: [WORKFLOWS_CONNECTOR_FEATURE_ID],
      },
    };

    const uiSettingsGet = jest.fn().mockReturnValue(false);
    mockHttp.get.mockResolvedValue(workflowsSpecResponse);

    const specActionType: ActionType = {
      id: 'workflows-spec-connector',
      name: 'Workflows Spec',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: [WORKFLOWS_CONNECTOR_FEATURE_ID],
      isSystemActionType: false,
      isDeprecated: false,
      source: ACTION_TYPE_SOURCES.spec,
    };

    actionTypeRegistry.has.mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionType: specActionType,
          http: mockHttp as any,
          uiSettings: { get: uiSettingsGet } as any,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.actionTypeModel?.getHideInUi?.([])).toBe(true);
    expect(uiSettingsGet).toHaveBeenCalledWith('workflows:ui:enabled', true);
  });

  describe('stale time window', () => {
    const specActionType: ActionType = {
      id: 'spec-connector',
      name: 'Spec Connector',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      isSystemActionType: false,
      isDeprecated: false,
      source: ACTION_TYPE_SOURCES.spec,
    };

    const mockNow = { value: 1_000_000 };

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockImplementation(() => mockNow.value);
      actionTypeRegistry.has.mockReturnValue(false);
      mockHttp.get.mockResolvedValue(mockSpecResponse);
      mockNow.value = 1_000_000;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('re-fetches spec after stale time window expires', async () => {
      const { result, unmount } = renderHook(
        () =>
          useActionTypeModel({
            actionTypeRegistry,
            actionType: specActionType,
            http: mockHttp as any,
            uiSettings: mockUiSettings as any,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockHttp.get).toHaveBeenCalledTimes(1);

      unmount();
      mockNow.value += 5 * 60 * 1000 + 1;

      renderHook(
        () =>
          useActionTypeModel({
            actionTypeRegistry,
            actionType: specActionType,
            http: mockHttp as any,
            uiSettings: mockUiSettings as any,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalledTimes(2);
      });
    });

    it('does not re-fetch spec within stale time window', async () => {
      const { result, unmount } = renderHook(
        () =>
          useActionTypeModel({
            actionTypeRegistry,
            actionType: specActionType,
            http: mockHttp as any,
            uiSettings: mockUiSettings as any,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockHttp.get).toHaveBeenCalledTimes(1);

      unmount();
      mockNow.value += 5 * 60 * 1000 - 1;

      const { result: resultAfterRemount } = renderHook(
        () =>
          useActionTypeModel({
            actionTypeRegistry,
            actionType: specActionType,
            http: mockHttp as any,
            uiSettings: mockUiSettings as any,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(resultAfterRemount.current.actionTypeModel).not.toBeNull();
      });

      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });
});
