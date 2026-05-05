/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { InferenceConnectorType, type ApiInferenceConnector } from '@kbn/inference-common';
import { loadConnectors, toAIConnector } from './load_connectors';
import { fetchConnectorsForFeature } from './fetch_connectors_for_feature';

jest.mock('./fetch_connectors_for_feature');
const fetchConnectorsForFeatureMock = fetchConnectorsForFeature as jest.MockedFn<
  typeof fetchConnectorsForFeature
>;

const createInferenceConnector = (
  overrides: Partial<ApiInferenceConnector> = {}
): ApiInferenceConnector => ({
  type: InferenceConnectorType.OpenAI,
  name: 'Test Connector',
  connectorId: 'test-connector-id',
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
  ...overrides,
});

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

  it('should propagate isRecommended when set on the API response', () => {
    const connector = createInferenceConnector({ isRecommended: true });

    expect(toAIConnector(connector).isRecommended).toBe(true);
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

  it('fetches connectors for the feature and maps them to AIConnector', async () => {
    const connector1 = createInferenceConnector({ connectorId: 'c1', name: 'Connector 1' });
    const connector2 = createInferenceConnector({
      connectorId: 'c2',
      name: 'Connector 2',
      isRecommended: true,
    });
    fetchConnectorsForFeatureMock.mockResolvedValue({
      connectors: [connector1, connector2],
      soEntryFound: false,
    });

    const result = await loadConnectors({ http, featureId: 'siem_migrations' });

    expect(fetchConnectorsForFeatureMock).toHaveBeenCalledWith(http, 'siem_migrations');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].id).toBe('c2');
    expect(result[1].isRecommended).toBe(true);
  });

  it('returns an empty array when no connectors are available', async () => {
    fetchConnectorsForFeatureMock.mockResolvedValue({
      connectors: [],
      soEntryFound: false,
    });

    const result = await loadConnectors({ http, featureId: 'test' });

    expect(result).toEqual([]);
  });
});
