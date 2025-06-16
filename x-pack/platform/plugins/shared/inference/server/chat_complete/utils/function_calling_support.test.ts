/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '../adapters/openai/types';
import { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import { isNativeFunctionCallingSupported } from './function_calling_support';

const createConnector = (
  parts: Partial<InferenceConnector> & Pick<InferenceConnector, 'type'>
): InferenceConnector => {
  return {
    connectorId: 'connector-id',
    name: 'my connector',
    config: {},
    ...parts,
  };
};

describe('isNativeFunctionCallingSupported', () => {
  it('returns true for gemini connector', () => {
    const connector = createConnector({ type: InferenceConnectorType.Gemini });
    expect(isNativeFunctionCallingSupported(connector)).toBe(true);
  });

  it('returns true for bedrock connector', () => {
    const connector = createConnector({ type: InferenceConnectorType.Bedrock });
    expect(isNativeFunctionCallingSupported(connector)).toBe(true);
  });

  it('returns true for inference connector', () => {
    const connector = createConnector({ type: InferenceConnectorType.Inference });
    expect(isNativeFunctionCallingSupported(connector)).toBe(true);
  });

  describe('openAI connector', () => {
    it('returns true for "OpenAI" provider', () => {
      const connector = createConnector({
        type: InferenceConnectorType.OpenAI,
        config: { apiProvider: OpenAiProviderType.OpenAi },
      });
      expect(isNativeFunctionCallingSupported(connector)).toBe(true);
    });

    it('returns true for "Azure" provider', () => {
      const connector = createConnector({
        type: InferenceConnectorType.OpenAI,
        config: { apiProvider: OpenAiProviderType.AzureAi },
      });
      expect(isNativeFunctionCallingSupported(connector)).toBe(true);
    });

    it('returns false for "Other" provider', () => {
      const connector = createConnector({
        type: InferenceConnectorType.OpenAI,
        config: { apiProvider: OpenAiProviderType.Other },
      });
      expect(isNativeFunctionCallingSupported(connector)).toBe(false);
    });

    it('returns true if the config is not exposed', () => {
      const connector = createConnector({
        type: InferenceConnectorType.OpenAI,
        config: {},
      });
      expect(isNativeFunctionCallingSupported(connector)).toBe(true);
    });
  });
});
