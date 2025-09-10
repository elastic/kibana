/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type InferenceConnector, InferenceConnectorType } from './connectors';
import { elasticModelIds } from '../inference_endpoints';
import { elasticModelDictionary } from '../const';
import { getContextWindowSize } from './connector_capabilities';
import { getModelDefinition } from './known_models';

const createConnector = (parts: Partial<InferenceConnector>): InferenceConnector => {
  return {
    type: InferenceConnectorType.OpenAI,
    name: 'connector',
    connectorId: 'connectorId',
    config: {},
    capabilities: {},
    ...parts,
  };
};

describe('getContextWindowSize', () => {
  it('returns the value from the connector config if set', () => {
    const connector = createConnector({
      config: {
        contextWindowSize: 100,
      },
    });
    expect(getContextWindowSize(connector)).toBe(100);
  });

  it('returns the value based on the config default model if set and model is known', () => {
    const connector = createConnector({
      config: {
        defaultModel: 'claude-3.5-sonnet',
      },
    });

    const expectedValue = getModelDefinition('claude-3.5-sonnet')!.contextWindow;

    expect(getContextWindowSize(connector)).toBe(expectedValue);
  });

  it('returns undefined if default model set but unknown', () => {
    const connector = createConnector({
      config: {
        defaultModel: 'not-a-real-model',
      },
    });

    expect(getContextWindowSize(connector)).toBe(undefined);
  });

  it('returns the right value for Elastic LLMs', () => {
    const connector = createConnector({
      type: InferenceConnectorType.Inference,
      config: {
        providerConfig: {
          model_id: elasticModelIds.RainbowSprinkles,
        },
        defaultModel: 'not-a-real-model',
      },
    });

    const expectedValue = getModelDefinition(
      elasticModelDictionary[elasticModelIds.RainbowSprinkles].model
    )!.contextWindow;

    expect(getContextWindowSize(connector)).toBe(expectedValue);
  });
});
