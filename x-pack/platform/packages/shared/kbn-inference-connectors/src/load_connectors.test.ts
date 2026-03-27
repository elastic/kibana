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
import { loadConnectors, toAIConnector, applyConnectorSettings } from './load_connectors';
import { fetchConnectorsForFeature } from './fetch_connectors_for_feature';

jest.mock('./fetch_connectors_for_feature');
const fetchConnectorsForFeatureMock = fetchConnectorsForFeature as jest.MockedFn<
  typeof fetchConnectorsForFeature
>;

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

describe('applyConnectorSettings', () => {
  it('should return all connectors when defaultOnly is false', () => {
    const connectors = [{ id: 'a' }, { id: 'b' }];
    const settings = createSettings('a', false);

    expect(applyConnectorSettings(connectors, settings)).toEqual(connectors);
  });

  it('should filter to default connector when defaultOnly is true', () => {
    const connectors = [{ id: 'a' }, { id: 'b' }];
    const settings = createSettings('a', true);

    expect(applyConnectorSettings(connectors, settings)).toEqual([{ id: 'a' }]);
  });

  it('should return all connectors when defaultOnly is true but default not found', () => {
    const connectors = [{ id: 'a' }, { id: 'b' }];
    const settings = createSettings('missing', true);

    expect(applyConnectorSettings(connectors, settings)).toEqual(connectors);
  });

  it('should return all connectors when no default connector is configured', () => {
    const connectors = [{ id: 'a' }, { id: 'b' }];
    const settings = createSettings(undefined, true);

    expect(applyConnectorSettings(connectors, settings)).toEqual(connectors);
  });
});

describe('loadConnectors', () => {
  const http = {} as HttpSetup;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch connectors, map to AIConnector, and apply settings', async () => {
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

  it('should apply default connector settings filter', async () => {
    const connector1 = createInferenceConnector({ connectorId: 'c1', name: 'Connector 1' });
    const connector2 = createInferenceConnector({ connectorId: 'c2', name: 'Connector 2' });
    fetchConnectorsForFeatureMock.mockResolvedValue({
      connectors: [connector1, connector2],
      soEntryFound: false,
    });
    const settings = createSettings('c1', true);

    const result = await loadConnectors({ http, featureId: 'test', settings });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
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
