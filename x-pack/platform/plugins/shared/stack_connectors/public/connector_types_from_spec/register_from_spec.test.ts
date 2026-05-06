/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { actionTypeRegistryMock } from '@kbn/alerts-ui-shared/src/common/test_utils/action_type_registry.mock';
import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionTypeModel } from '@kbn/alerts-ui-shared';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { registerConnectorTypesFromSpecs } from './register_from_spec';

// Mock the dynamic import modules
const mockConnectorsSpecs: Record<string, ConnectorSpec> = {};

jest.mock('@kbn/connector-specs', () => ({
  connectorsSpecs: mockConnectorsSpecs,
  authTypeSpecs: jest.requireActual('@kbn/connector-specs').authTypeSpecs,
}));

jest.mock('@kbn/response-ops-form-generator', () => ({
  generateFormFields: jest.fn().mockReturnValue([]),
}));

const defaultConnectorSpec: ConnectorSpec = {
  metadata: {
    id: '.test-connector',
    displayName: 'Test Connector',
    description: 'Test connector description',
    supportedFeatureIds: [WorkflowsConnectorFeatureId],
    minimumLicense: 'basic',
  },
  actions: {},
};

const connectorSpecWithAuth: ConnectorSpec = {
  ...defaultConnectorSpec,
  metadata: {
    ...defaultConnectorSpec.metadata,
    id: '.test-connector-auth',
    supportedFeatureIds: ['alerting', 'workflows'],
  },
  auth: {
    types: ['bearer', 'basic'],
  },
};

describe('registerConnectorTypesFromSpecs', () => {
  let connectorTypeRegistry: ReturnType<typeof actionTypeRegistryMock.create>;
  let uiSettings: ReturnType<typeof coreMock.createStart>['uiSettings'];
  let uiSettingsPromise: Promise<ReturnType<typeof coreMock.createStart>['uiSettings']>;

  beforeEach(() => {
    // Clear the mock connectors specs before each test
    Object.keys(mockConnectorsSpecs).forEach((key) => {
      delete mockConnectorsSpecs[key];
    });
    connectorTypeRegistry = actionTypeRegistryMock.create();
    uiSettings = coreMock.createStart().uiSettings;
    uiSettingsPromise = Promise.resolve(uiSettings);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register connector types from specs', async () => {
    const mockSpec1: ConnectorSpec = {
      ...defaultConnectorSpec,
      metadata: {
        ...defaultConnectorSpec.metadata,
        id: '.test-connector-1',
        displayName: 'Test Connector 1',
        description: 'Test connector description 1',
        supportedFeatureIds: ['alerting'],
      },
    };

    const mockSpec2: ConnectorSpec = {
      ...defaultConnectorSpec,
      metadata: {
        ...defaultConnectorSpec.metadata,
        id: '.test-connector-2',
        displayName: 'Test Connector 2',
        description: 'Test connector description 2',
        supportedFeatureIds: ['alerting'],
      },
    };

    mockConnectorsSpecs['test-connector-1'] = mockSpec1;
    mockConnectorsSpecs['test-connector-2'] = mockSpec2;

    registerConnectorTypesFromSpecs({
      connectorTypeRegistry:
        connectorTypeRegistry as unknown as TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'],
      uiSettingsPromise,
      isEarsEnabled: false,
    });

    // Wait for the async import to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(connectorTypeRegistry.register).toHaveBeenCalledTimes(2);
    expect(connectorTypeRegistry.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '.test-connector-1',
        actionTypeTitle: 'Test Connector 1',
        selectMessage: 'Test connector description 1',
      })
    );
    expect(connectorTypeRegistry.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '.test-connector-2',
        actionTypeTitle: 'Test Connector 2',
        selectMessage: 'Test connector description 2',
      })
    );
  });

  it('should handle workflows connector with workflows:ui:enabled setting', async () => {
    const mockSpec: ConnectorSpec = {
      ...defaultConnectorSpec,
      metadata: {
        ...defaultConnectorSpec.metadata,
        id: '.workflows-connector',
        displayName: 'Workflows Connector',
        description: 'Workflows connector description',
        supportedFeatureIds: [WorkflowsConnectorFeatureId],
      },
    };

    uiSettings.get.mockReturnValue(true);
    mockConnectorsSpecs['workflows-connector'] = mockSpec;

    registerConnectorTypesFromSpecs({
      connectorTypeRegistry:
        connectorTypeRegistry as unknown as TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'],
      uiSettingsPromise,
      isEarsEnabled: false,
    });

    // Wait for the async import and uiSettings promise to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
    await uiSettingsPromise;

    expect(connectorTypeRegistry.register).toHaveBeenCalledTimes(1);
    const registeredCall = connectorTypeRegistry.register.mock.calls[0][0] as ActionTypeModel;

    // Wait a bit more for uiSettings ref to be populated
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Test getHideInUi when workflows:ui:enabled is true
    expect(registeredCall.getHideInUi?.([])).toBe(false);
  });

  it('should hide workflows connector when workflows:ui:enabled is false', async () => {
    const mockSpec: ConnectorSpec = {
      ...defaultConnectorSpec,
      metadata: {
        ...defaultConnectorSpec.metadata,
        id: '.workflows-connector',
        displayName: 'Workflows Connector',
        description: 'Workflows connector description',
        supportedFeatureIds: [WorkflowsConnectorFeatureId],
      },
    };

    uiSettings.get.mockReturnValue(false);
    mockConnectorsSpecs['workflows-connector'] = mockSpec;

    registerConnectorTypesFromSpecs({
      connectorTypeRegistry:
        connectorTypeRegistry as unknown as TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'],
      uiSettingsPromise,
      isEarsEnabled: false,
    });

    // Wait for the async import and uiSettings promise to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
    await uiSettingsPromise;

    expect(connectorTypeRegistry.register).toHaveBeenCalledTimes(1);
    const registeredCall = connectorTypeRegistry.register.mock.calls[0][0] as ActionTypeModel;

    // Wait a bit more for uiSettings ref to be populated
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Test getHideInUi when workflows:ui:enabled is false
    expect(registeredCall.getHideInUi?.([])).toBe(true);
  });

  it('should not hide non-workflows connectors', async () => {
    const mockSpec: ConnectorSpec = {
      ...defaultConnectorSpec,
      metadata: {
        ...defaultConnectorSpec.metadata,
        id: '.regular-connector',
        displayName: 'Regular Connector',
        description: 'Regular connector description',
        supportedFeatureIds: ['alerting'],
      },
    };

    mockConnectorsSpecs['regular-connector'] = mockSpec;

    registerConnectorTypesFromSpecs({
      connectorTypeRegistry:
        connectorTypeRegistry as unknown as TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'],
      uiSettingsPromise,
      isEarsEnabled: false,
    });

    // Wait for the async import to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(connectorTypeRegistry.register).toHaveBeenCalledTimes(1);
    const registeredCall = connectorTypeRegistry.register.mock.calls[0][0] as ActionTypeModel;

    // Non-workflows connectors should not be hidden
    expect(registeredCall.getHideInUi?.([])).toBe(false);
  });

  it('should handle connector with multiple supported feature ids', async () => {
    const mockSpec: ConnectorSpec = {
      ...defaultConnectorSpec,
      metadata: {
        ...defaultConnectorSpec.metadata,
        id: '.multi-feature-connector',
        displayName: 'Multi Feature Connector',
        description: 'Multi feature connector description',
        supportedFeatureIds: ['alerting', WorkflowsConnectorFeatureId],
      },
    };

    mockConnectorsSpecs['multi-feature-connector'] = mockSpec;

    registerConnectorTypesFromSpecs({
      connectorTypeRegistry:
        connectorTypeRegistry as unknown as TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'],
      uiSettingsPromise,
      isEarsEnabled: false,
    });

    // Wait for the async import to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(connectorTypeRegistry.register).toHaveBeenCalledTimes(1);
    const registeredCall = connectorTypeRegistry.register.mock.calls[0][0] as ActionTypeModel;

    // Connectors with multiple feature IDs should not be hidden
    expect(registeredCall.getHideInUi?.([])).toBe(false);
  });

  it('should handle empty connectorsSpecs', async () => {
    registerConnectorTypesFromSpecs({
      connectorTypeRegistry:
        connectorTypeRegistry as unknown as TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'],
      uiSettingsPromise,
      isEarsEnabled: false,
    });

    // Wait for the async import to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(connectorTypeRegistry.register).not.toHaveBeenCalled();
  });

  describe('registered connector model properties', () => {
    const getRegisteredModel = async (): Promise<ActionTypeModel> => {
      mockConnectorsSpecs['test-connector-auth'] = connectorSpecWithAuth;

      registerConnectorTypesFromSpecs({
        connectorTypeRegistry:
          connectorTypeRegistry as unknown as TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'],
        uiSettingsPromise,
        isEarsEnabled: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      return connectorTypeRegistry.register.mock.calls[0][0] as ActionTypeModel;
    };

    describe('connectorForm.serializer', () => {
      const baseFormData = {
        actionTypeId: '.test-connector-auth',
        isDeprecated: false,
      };

      it('copies secrets.authType to config.authType on save', async () => {
        const model = await getRegisteredModel();
        const result = model.connectorForm!.serializer!({
          ...baseFormData,
          config: { url: 'https://example.com' },
          secrets: { authType: 'bearer', token: 'my-token' },
        });
        expect(result.config.authType).toBe('bearer');
        expect(result.secrets.authType).toBe('bearer');
      });

      it('returns form data unchanged when secrets.authType is absent', async () => {
        const model = await getRegisteredModel();
        const formData = {
          ...baseFormData,
          config: { url: 'https://example.com' },
          secrets: {},
        };
        const result = model.connectorForm!.serializer!(formData);
        expect(result).toEqual(formData);
      });

      it('preserves authMode from form data', async () => {
        const model = await getRegisteredModel();
        const result = model.connectorForm!.serializer!({
          ...baseFormData,
          authMode: 'per-user',
          config: { url: 'https://example.com' },
          secrets: { authType: 'bearer', token: 'my-token' },
        });
        expect(result.authMode).toBe('per-user');
      });
    });

    describe('connectorForm.deserializer', () => {
      it('copies config.authType to secrets.authType on load', async () => {
        const model = await getRegisteredModel();
        const apiData = {
          actionTypeId: '.test-connector-auth',
          isDeprecated: false,
          config: { authType: 'bearer' },
          secrets: {},
        };
        const result = model.connectorForm!.deserializer!(apiData);
        expect(result.secrets.authType).toBe('bearer');
      });

      it('returns api data unchanged when config.authType is absent', async () => {
        const model = await getRegisteredModel();
        const apiData = {
          actionTypeId: '.test-connector-auth',
          isDeprecated: false,
          config: {},
          secrets: {},
        };
        const result = model.connectorForm!.deserializer!(apiData);
        expect(result).toEqual(apiData);
      });

      it('does not overwrite existing secrets.authType', async () => {
        const model = await getRegisteredModel();
        const apiData = {
          actionTypeId: '.test-connector-auth',
          isDeprecated: false,
          config: { authType: 'bearer' },
          secrets: { authType: 'basic' },
        };
        const result = model.connectorForm!.deserializer!(apiData);
        expect(result.secrets.authType).toBe('basic');
      });

      it('preserves authMode from the API response', async () => {
        const model = await getRegisteredModel();
        const apiData = {
          actionTypeId: '.test-connector-auth',
          isDeprecated: false,
          authMode: 'per-user' as const,
          config: { authType: 'bearer' },
          secrets: {},
        };
        const result = model.connectorForm!.deserializer!(apiData);
        expect(result.authMode).toBe('per-user');
      });
    });
  });
});
