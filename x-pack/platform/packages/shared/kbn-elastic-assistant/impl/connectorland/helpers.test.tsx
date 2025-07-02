/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getGenAiConfig,
  getActionTypeTitle,
  getConnectorTypeTitle,
  OpenAiProviderType,
  AiConfigCatchAll,
} from './helpers';
import { PRECONFIGURED_CONNECTOR } from './translations';
import {
  type ActionConnector,
  type ActionTypeModel,
  type ActionTypeRegistryContract,
} from '@kbn/alerts-ui-shared';

const mockConnector = (config: AiConfigCatchAll, isPreconfigured = false) => ({
  isPreconfigured,
  config,
  actionTypeId: 'test-action',
});

describe('getGenAiConfig', () => {
  test('returns empty object when connector is undefined', () => {
    expect(getGenAiConfig(undefined)).toEqual({});
  });

  test('extracts apiProvider, apiUrl, and defaultModel from connector config', () => {
    const connector = mockConnector({
      apiProvider: OpenAiProviderType.OpenAi,
      apiUrl: 'https://api.openai.com',
      defaultModel: 'gpt-4',
    }) as ActionConnector;
    expect(getGenAiConfig(connector)).toEqual({
      apiProvider: OpenAiProviderType.OpenAi,
      apiUrl: 'https://api.openai.com',
      defaultModel: 'gpt-4',
    });
  });

  test('extracts defaultModel from inference config', () => {
    const connector = mockConnector({
      providerConfig: {
        model_id: 'rainbow-sprinkles',
      },
    }) as ActionConnector;
    expect(getGenAiConfig(connector)).toEqual({
      defaultModel: 'rainbow-sprinkles',
    });
  });

  test('extracts api-version from Azure API URL', () => {
    const connector = mockConnector({
      apiProvider: OpenAiProviderType.AzureAi,
      apiUrl: 'https://api.azure.com?api-version=2024-01-01',
    }) as ActionConnector;
    expect(getGenAiConfig(connector)).toEqual({
      apiProvider: OpenAiProviderType.AzureAi,
      apiUrl: 'https://api.azure.com?api-version=2024-01-01',
      defaultModel: '2024-01-01',
    });
  });
});

describe('getActionTypeTitle', () => {
  test('returns actionTypeTitle if defined', () => {
    expect(getActionTypeTitle({ actionTypeTitle: 'Test Action' } as ActionTypeModel)).toBe(
      'Test Action'
    );
  });

  test('returns id if actionTypeTitle is undefined', () => {
    expect(getActionTypeTitle({ id: 'test-id' } as ActionTypeModel)).toBe('test-id');
  });
});

describe('getConnectorTypeTitle', () => {
  const mockActionTypeRegistry = {
    get: jest.fn().mockReturnValue({ actionTypeTitle: 'Fallback Action' }),
  } as unknown as ActionTypeRegistryContract;

  test('returns null when connector is undefined', () => {
    expect(getConnectorTypeTitle(undefined, mockActionTypeRegistry)).toBeNull();
  });

  test('returns PRECONFIGURED_CONNECTOR for preconfigured connectors', () => {
    const connector = mockConnector({}, true) as ActionConnector;
    expect(getConnectorTypeTitle(connector, mockActionTypeRegistry)).toBe(PRECONFIGURED_CONNECTOR);
  });

  test('returns apiProvider if defined in config', () => {
    const connector = mockConnector({ apiProvider: OpenAiProviderType.OpenAi }) as ActionConnector;
    expect(getConnectorTypeTitle(connector, mockActionTypeRegistry)).toBe('OpenAI');
  });

  test('returns action type title from registry if apiProvider is undefined', () => {
    const connector = mockConnector({}) as ActionConnector;
    expect(getConnectorTypeTitle(connector, mockActionTypeRegistry)).toBe('Fallback Action');
  });
});
