/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { loadConnectors, toAIConnector } from './load_connectors';
import { fetchConnectorsForFeature } from './fetch_connectors_for_feature';
import { fetchConnectorById } from './fetch_connector_by_id';

jest.mock('./fetch_connectors_for_feature');
const fetchConnectorsForFeatureMock = fetchConnectorsForFeature as jest.MockedFn<
  typeof fetchConnectorsForFeature
>;

jest.mock('./fetch_connector_by_id');
const fetchConnectorByIdMock = fetchConnectorById as jest.MockedFn<typeof fetchConnectorById>;

const createInferenceConnector = (
  overrides: Partial<InferenceConnector> = {}
): InferenceConnector => ({
  type: InferenceConnectorType.OpenAI,
  name: 'Test Connector',
  connectorId: 'test-connector-id',
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
  ...overrides,
});

const createSettings = (defaultConnectorId?: string, defaultOnly = false): SettingsStart =>
  ({
    client: {
      get: jest.fn((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return defaultConnectorId;
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return defaultOnly;
        return undefined;
      }),
    },
  } as unknown as SettingsStart);

describe('toAIConnector', () => {
  it('should map InferenceConnector fields to AIConnector shape', () => {
    const connector = createInferenceConnector({
      connectorId: 'my-endpoint',
      name: 'My Connector',
      type: InferenceConnectorType.Bedrock,
      config: { region: 'us-east-1' },
      isPreconfigured: true,
      isDeprecated: true,
      isConnectorTypeDeprecated: true,
      isMissingSecrets: true,
    });

    const result = toAIConnector(connector);

    expect(result).toEqual({
      id: 'my-endpoint',
      name: 'My Connector',
      actionTypeId: InferenceConnectorType.Bedrock,
      config: { region: 'us-east-1' },
      secrets: {},
      isPreconfigured: true,
      isSystemAction: false,
      isDeprecated: true,
      isConnectorTypeDeprecated: true,
      isMissingSecrets: true,
      isRecommended: undefined,
      apiProvider: undefined,
    });
  });

  it('should default optional boolean fields to false when undefined', () => {
    const connector = createInferenceConnector({
      isDeprecated: undefined,
      isConnectorTypeDeprecated: undefined,
      isMissingSecrets: undefined,
    });

    const result = toAIConnector(connector);

    expect(result.isDeprecated).toBe(false);
    expect(result.isConnectorTypeDeprecated).toBe(false);
    expect(result.isMissingSecrets).toBe(false);
  });

  it('should set apiProvider for non-preconfigured OpenAI connectors', () => {
    const connector = createInferenceConnector({
      isPreconfigured: false,
      config: { apiProvider: 'OpenAI' },
    });

    expect(toAIConnector(connector).apiProvider).toBe('OpenAI');
  });

  it('should not set apiProvider for preconfigured connectors', () => {
    const connector = createInferenceConnector({
      isPreconfigured: true,
      config: { apiProvider: 'OpenAI' },
    });

    expect(toAIConnector(connector).apiProvider).toBeUndefined();
  });
});

describe('loadConnectors', () => {
  const http = {} as HttpSetup;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch connectors and map to AIConnector', async () => {
    const connector1 = createInferenceConnector({ connectorId: 'c1', name: 'Connector 1' });
    const connector2 = createInferenceConnector({ connectorId: 'c2', name: 'Connector 2' });
    fetchConnectorsForFeatureMock.mockResolvedValue({
      connectors: [connector1, connector2],
      soEntryFound: false,
    });
    const settings = createSettings();

    const result = await loadConnectors({ http, featureId: 'siem_migrations', settings });

    expect(fetchConnectorsForFeatureMock).toHaveBeenCalledWith(http, 'siem_migrations');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].id).toBe('c2');
  });

  it('should fetch default connector by ID when defaultOnly is true', async () => {
    const aiConnector = {
      id: 'c1',
      name: 'Connector 1',
      actionTypeId: InferenceConnectorType.OpenAI,
      config: {},
      secrets: {},
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
      isConnectorTypeDeprecated: false,
      isMissingSecrets: false,
    };
    fetchConnectorByIdMock.mockResolvedValue(aiConnector as any);
    const settings = createSettings('c1', true);

    const result = await loadConnectors({ http, featureId: 'test', settings });

    expect(fetchConnectorByIdMock).toHaveBeenCalledWith(http, 'c1');
    expect(fetchConnectorsForFeatureMock).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('should return empty array when defaultOnly is true but connector is not found', async () => {
    fetchConnectorByIdMock.mockResolvedValue(undefined);
    const settings = createSettings('missing', true);

    const result = await loadConnectors({ http, featureId: 'test', settings });

    expect(fetchConnectorByIdMock).toHaveBeenCalledWith(http, 'missing');
    expect(fetchConnectorsForFeatureMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should return empty array when defaultOnly is true but no default connector is configured', async () => {
    const settings = createSettings(undefined, true);

    const result = await loadConnectors({ http, featureId: 'test', settings });

    expect(fetchConnectorByIdMock).not.toHaveBeenCalled();
    expect(fetchConnectorsForFeatureMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should return default connector first when no SO entry and default is configured', async () => {
    const defaultAiConnector = {
      id: 'default',
      name: 'Default Connector',
      actionTypeId: InferenceConnectorType.OpenAI,
      config: {},
      secrets: {},
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
      isConnectorTypeDeprecated: false,
      isMissingSecrets: false,
    };
    fetchConnectorByIdMock.mockResolvedValue(defaultAiConnector as any);
    const connector1 = createInferenceConnector({ connectorId: 'c1', name: 'Connector 1' });
    const connectorDefault = createInferenceConnector({
      connectorId: 'default',
      name: 'Default Connector',
    });
    fetchConnectorsForFeatureMock.mockResolvedValue({
      connectors: [connector1, connectorDefault],
      soEntryFound: false,
    });
    const settings = createSettings('default');

    const result = await loadConnectors({ http, featureId: 'test', settings });

    expect(fetchConnectorByIdMock).toHaveBeenCalledWith(http, 'default');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('default');
    expect(result[1].id).toBe('c1');
  });

  it('should prepend default connector even if not in the feature list', async () => {
    const defaultAiConnector = {
      id: 'external',
      name: 'External Connector',
      actionTypeId: InferenceConnectorType.OpenAI,
      config: {},
      secrets: {},
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
      isConnectorTypeDeprecated: false,
      isMissingSecrets: false,
    };
    fetchConnectorByIdMock.mockResolvedValue(defaultAiConnector as any);
    const connector1 = createInferenceConnector({ connectorId: 'c1', name: 'Connector 1' });
    fetchConnectorsForFeatureMock.mockResolvedValue({
      connectors: [connector1],
      soEntryFound: false,
    });
    const settings = createSettings('external');

    const result = await loadConnectors({ http, featureId: 'test', settings });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('external');
    expect(result[1].id).toBe('c1');
  });

  it('should not reorder when connectors are set via saved object', async () => {
    const connector1 = createInferenceConnector({ connectorId: 'c1', name: 'Connector 1' });
    const connector2 = createInferenceConnector({ connectorId: 'c2', name: 'Connector 2' });
    fetchConnectorsForFeatureMock.mockResolvedValue({
      connectors: [connector1, connector2],
      soEntryFound: true,
    });
    const settings = createSettings('c2');

    const result = await loadConnectors({ http, featureId: 'test', settings });

    expect(fetchConnectorByIdMock).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].id).toBe('c2');
  });

  it('should return empty array when no connectors are available', async () => {
    fetchConnectorsForFeatureMock.mockResolvedValue({
      connectors: [],
      soEntryFound: false,
    });
    const settings = createSettings();

    const result = await loadConnectors({ http, featureId: 'test', settings });

    expect(result).toEqual([]);
  });
});
