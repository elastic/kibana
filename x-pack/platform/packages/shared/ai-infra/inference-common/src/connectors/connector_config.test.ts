/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type InferenceConnector, InferenceConnectorType } from './connectors';

import { getConnectorDefaultModel } from './connector_config';

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
      expect(getConnectorDefaultModel(connector)).toBe('gpt-4.1');
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
