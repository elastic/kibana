/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type InferenceConnector, InferenceConnectorType } from './connectors';

import { ModelFamily } from '../model_provider';
import {
  DEFAULT_OPENAI_MODEL,
  getConnectorDefaultModel,
  getConnectorFamily,
} from './connector_config';

const createConnector = (parts: Partial<InferenceConnector>): InferenceConnector => {
  return {
    type: InferenceConnectorType.OpenAI,
    name: 'connector',
    connectorId: 'connectorId',
    config: {},
    isInferenceEndpoint: false,
    isPreconfigured: false,
    capabilities: {},
    ...parts,
  };
};

describe('getConnectorFamily', () => {
  describe('Elastic/EIS connector', () => {
    // One `Elastic` provider fronts Anthropic, Google and OpenAI models. Deriving the
    // family from the provider stamped every one of them `Claude`, which silently
    // broke family-based grouping downstream (eval score attribution, judge-family
    // rules). The model name is the only signal that distinguishes them.
    const eisConnector = (modelId: string) =>
      createConnector({
        type: InferenceConnectorType.Inference,
        config: { providerConfig: { model_id: modelId } },
      });

    it.each([
      ['google-gemini-3.1-pro', ModelFamily.Gemini],
      ['google-gemini-3.0-flash', ModelFamily.Gemini],
      ['openai-gpt-5.5', ModelFamily.GPT],
      ['openai-gpt-oss-120b', ModelFamily.GPT],
      ['anthropic-claude-5-sonnet', ModelFamily.Claude],
      ['anthropic-claude-4.6-opus', ModelFamily.Claude],
    ])('attributes %s to %s', (modelId, expected) => {
      expect(getConnectorFamily(eisConnector(modelId))).toBe(expected);
    });

    it('prefers an explicitly passed model name over the connector config', () => {
      expect(getConnectorFamily(eisConnector('anthropic-claude-5-sonnet'), 'openai-gpt-5.5')).toBe(
        ModelFamily.GPT
      );
    });

    it('falls back to Claude when the model name carries no family token', () => {
      expect(getConnectorFamily(eisConnector('gp-llm-v2'))).toBe(ModelFamily.Claude);
    });
  });

  describe('legacy typed connectors', () => {
    it('keeps deriving Gemini from a Gemini connector', () => {
      expect(
        getConnectorFamily(createConnector({ type: InferenceConnectorType.Gemini, config: {} }))
      ).toBe(ModelFamily.Gemini);
    });

    it('keeps deriving Claude from a Bedrock connector', () => {
      expect(
        getConnectorFamily(createConnector({ type: InferenceConnectorType.Bedrock, config: {} }))
      ).toBe(ModelFamily.Claude);
    });

    it('keeps deriving GPT from an OpenAI connector', () => {
      expect(
        getConnectorFamily(
          createConnector({
            type: InferenceConnectorType.OpenAI,
            config: { defaultModel: 'gpt-4' },
          })
        )
      ).toBe(ModelFamily.GPT);
    });

    it('trusts the model name over the connector type when they disagree', () => {
      // A Bedrock connector serving a Gemini model is Gemini, not Claude.
      expect(
        getConnectorFamily(
          createConnector({
            type: InferenceConnectorType.Bedrock,
            config: { defaultModel: 'gemini-2.5-pro' },
          })
        )
      ).toBe(ModelFamily.Gemini);
    });
  });
});

describe('getConnectorDefaultModel', () => {
  describe('OpenAI connector', () => {
    it('returns the expected value when default model is set', () => {
      const connector = createConnector({
        type: InferenceConnectorType.OpenAI,
        config: {
          defaultModel: 'gpt-4',
        },
      });
      expect(getConnectorDefaultModel(connector)).toBe('gpt-4');
    });
    it('returns the expected value when default model is not set for non OpenAI provider', () => {
      const connector = createConnector({
        type: InferenceConnectorType.OpenAI,
        config: {},
      });
      expect(getConnectorDefaultModel(connector)).toBe(undefined);
    });

    it('returns the expected value when default model is not set for OpenAI provider', () => {
      const connector = createConnector({
        type: InferenceConnectorType.OpenAI,
        config: {
          apiProvider: 'OpenAI',
        },
      });
      expect(getConnectorDefaultModel(connector)).toBe(DEFAULT_OPENAI_MODEL);
    });
  });

  describe('Gemini connector', () => {
    it('returns the expected value when default model is set', () => {
      const connector = createConnector({
        type: InferenceConnectorType.Gemini,
        config: {
          defaultModel: 'gemini-pro-1',
        },
      });
      expect(getConnectorDefaultModel(connector)).toBe('gemini-pro-1');
    });
    it('returns the expected value when default model is not set', () => {
      const connector = createConnector({
        type: InferenceConnectorType.Gemini,
        config: {},
      });
      expect(getConnectorDefaultModel(connector)).toBe(undefined);
    });
  });

  describe('Bedrock connector', () => {
    it('returns the expected value when default model is set', () => {
      const connector = createConnector({
        type: InferenceConnectorType.Bedrock,
        config: {
          defaultModel: 'claude-3.5',
        },
      });
      expect(getConnectorDefaultModel(connector)).toBe('claude-3.5');
    });
    it('returns the expected value when default model is not set', () => {
      const connector = createConnector({
        type: InferenceConnectorType.Bedrock,
        config: {},
      });
      expect(getConnectorDefaultModel(connector)).toBe(undefined);
    });
  });

  describe('Inference connector', () => {
    it('returns the expected value when default model is set', () => {
      const connector = createConnector({
        type: InferenceConnectorType.Inference,
        config: {
          providerConfig: {
            model_id: 'some-elastic-llm-name',
          },
        },
      });
      expect(getConnectorDefaultModel(connector)).toBe('some-elastic-llm-name');
    });
    it('returns the expected value when default model is not set', () => {
      const connector = createConnector({
        type: InferenceConnectorType.Inference,
        config: {},
      });
      expect(getConnectorDefaultModel(connector)).toBe(undefined);
    });
  });
});
