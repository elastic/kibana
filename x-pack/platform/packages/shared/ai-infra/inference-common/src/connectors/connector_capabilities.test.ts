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

  describe('EIS advertised context window', () => {
    const createEisConnector = (
      parts: Partial<InferenceConnector> & { modelId?: string }
    ): InferenceConnector => {
      const { modelId, ...rest } = parts;
      return createConnector({
        type: InferenceConnectorType.Inference,
        isInferenceEndpoint: true,
        isEis: true,
        config: { providerConfig: { model_id: modelId } },
        ...rest,
      });
    };

    it('returns the advertised max_input_tokens, even for a model unknown to the static list', () => {
      const connector = createEisConnector({
        modelId: 'openai-gpt-42-nova',
        metadata: {
          capabilities: {
            context_window: { max_input_tokens: 1050000, max_output_tokens: 128000 },
          },
        },
      });

      expect(getContextWindowSize(connector)).toBe(1050000);
    });

    it('prefers the advertised max_input_tokens over the static model lookup', () => {
      const connector = createEisConnector({
        modelId: 'anthropic-claude-4.6-sonnet',
        metadata: { capabilities: { context_window: { max_input_tokens: 123456 } } },
      });

      expect(getContextWindowSize(connector)).toBe(123456);
    });

    it('prefers the explicit contextWindowLength setting over the advertised value', () => {
      const connector = createEisConnector({
        modelId: 'anthropic-claude-4.6-sonnet',
        config: {
          contextWindowLength: 100,
          providerConfig: { model_id: 'anthropic-claude-4.6-sonnet' },
        },
        metadata: { capabilities: { context_window: { max_input_tokens: 123456 } } },
      });

      expect(getContextWindowSize(connector)).toBe(100);
    });

    it.each<{ description: string; metadata: InferenceConnector['metadata'] }>([
      { description: 'no metadata', metadata: undefined },
      { description: 'no capabilities', metadata: { display: { name: 'Model' } } },
      {
        description: 'capabilities without a context window',
        metadata: { capabilities: { reasoning: { supported_effort_levels: ['high'] } } },
      },
      {
        description: 'a context window without max_input_tokens',
        metadata: { capabilities: { context_window: { max_output_tokens: 1000 } } },
      },
      {
        description: 'a zero max_input_tokens',
        metadata: { capabilities: { context_window: { max_input_tokens: 0 } } },
      },
    ])('falls back to the static model lookup with $description', ({ metadata }) => {
      const connector = createEisConnector({ modelId: 'anthropic-claude-4.6-sonnet', metadata });

      expect(getContextWindowSize(connector)).toBe(
        getModelDefinition('anthropic-claude-4.6-sonnet')!.contextWindow
      );
    });
  });
});
