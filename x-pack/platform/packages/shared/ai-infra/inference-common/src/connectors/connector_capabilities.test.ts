/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type InferenceConnector, InferenceConnectorType } from './connectors';
import { elasticModelIds } from '../inference_endpoints';
import { elasticModelDictionary } from '../const';
import { getContextWindowSize, getSupportedReasoningEffortLevels } from './connector_capabilities';
import { getModelDefinition } from './known_models';

const createConnector = (parts: Partial<InferenceConnector>): InferenceConnector => {
  return {
    type: InferenceConnectorType.OpenAI,
    name: 'connector',
    connectorId: 'connectorId',
    config: {},
    capabilities: {},
    isInferenceEndpoint: false,
    isPreconfigured: false,
    ...parts,
  };
};

describe('getContextWindowSize', () => {
  it('returns the value from the connector config if set', () => {
    const connector = createConnector({
      config: {
        contextWindowLength: 100,
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

describe('getSupportedReasoningEffortLevels', () => {
  const createEisConnector = (metadata: InferenceConnector['metadata']): InferenceConnector =>
    createConnector({
      type: InferenceConnectorType.Inference,
      isInferenceEndpoint: true,
      isEis: true,
      metadata,
    });

  it.each<{ description: string; connector: InferenceConnector }>([
    {
      description: 'a non-EIS connector, even when capabilities are present',
      connector: createConnector({
        isEis: false,
        metadata: { capabilities: { reasoning: { supported_effort_levels: ['high'] } } },
      }),
    },
    { description: 'an EIS connector without metadata', connector: createEisConnector(undefined) },
    {
      description: 'an EIS connector without capabilities',
      connector: createEisConnector({ display: { name: 'Model' } }),
    },
    {
      description: 'capabilities that do not advertise reasoning',
      connector: createEisConnector({
        capabilities: { context_window: { max_input_tokens: 1000 } },
      }),
    },
    {
      description: 'reasoning advertised without levels',
      connector: createEisConnector({ capabilities: { reasoning: {} } }),
    },
    {
      description: 'reasoning advertised with an empty list of levels',
      connector: createEisConnector({
        capabilities: { reasoning: { supported_effort_levels: [] } },
      }),
    },
  ])('returns undefined for $description', ({ connector }) => {
    expect(getSupportedReasoningEffortLevels(connector)).toBeUndefined();
  });

  it('returns the advertised levels', () => {
    const connector = createEisConnector({
      capabilities: {
        reasoning: { supported_effort_levels: ['high', 'low'], default_effort_level: 'high' },
      },
    });

    expect(getSupportedReasoningEffortLevels(connector)).toEqual(['high', 'low']);
  });
});
