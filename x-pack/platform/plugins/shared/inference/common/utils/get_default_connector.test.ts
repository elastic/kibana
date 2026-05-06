/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import { getDefaultConnector } from './get_default_connector';

const createConnector = (parts: Partial<InferenceConnector> = {}): InferenceConnector => ({
  connectorId: 'default-id',
  name: 'Default',
  type: InferenceConnectorType.OpenAI,
  config: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
  capabilities: {},
  ...parts,
});

describe('getDefaultConnector', () => {
  describe('defaultConnectorId', () => {
    it('returns the connector matching defaultConnectorId when present', () => {
      const connectors = [
        createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
        createConnector({ connectorId: 'inference-1', type: InferenceConnectorType.Inference }),
        createConnector({ connectorId: 'bedrock-1', type: InferenceConnectorType.Bedrock }),
      ];
      const result = getDefaultConnector({ connectors, defaultConnectorId: 'bedrock-1' });
      expect(result.connectorId).toBe('bedrock-1');
    });

    it('falls back to type-based priority when defaultConnectorId is not found', () => {
      const connectors = [
        createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
        createConnector({ connectorId: 'inference-1', type: InferenceConnectorType.Inference }),
      ];
      const result = getDefaultConnector({ connectors, defaultConnectorId: 'missing-id' });
      expect(result.connectorId).toBe('inference-1');
    });

    it('falls back to type-based priority when defaultConnectorId is NO_DEFAULT_CONNECTOR', () => {
      const connectors = [
        createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
        createConnector({ connectorId: 'inference-1', type: InferenceConnectorType.Inference }),
      ];
      const result = getDefaultConnector({
        connectors,
        defaultConnectorId: 'NO_DEFAULT_CONNECTOR',
      });
      expect(result.connectorId).toBe('inference-1');
    });

    it('falls back to type-based priority when defaultConnectorId is undefined', () => {
      const connectors = [
        createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
        createConnector({ connectorId: 'inference-1', type: InferenceConnectorType.Inference }),
      ];
      const result = getDefaultConnector({ connectors });
      expect(result.connectorId).toBe('inference-1');
    });
  });

  describe('type-based priority fallback', () => {
    it('prefers Inference connector over OpenAI', () => {
      const connectors = [
        createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
        createConnector({ connectorId: 'inference-1', type: InferenceConnectorType.Inference }),
      ];
      const result = getDefaultConnector({ connectors });
      expect(result.connectorId).toBe('inference-1');
    });

    it('prefers OpenAI connector when no Inference connector exists', () => {
      const connectors = [
        createConnector({ connectorId: 'bedrock-1', type: InferenceConnectorType.Bedrock }),
        createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
      ];
      const result = getDefaultConnector({ connectors });
      expect(result.connectorId).toBe('openai-1');
    });

    it('returns first connector when no Inference or OpenAI connector exists', () => {
      const connectors = [
        createConnector({ connectorId: 'bedrock-1', type: InferenceConnectorType.Bedrock }),
        createConnector({ connectorId: 'gemini-1', type: InferenceConnectorType.Gemini }),
      ];
      const result = getDefaultConnector({ connectors });
      expect(result.connectorId).toBe('bedrock-1');
    });
  });
});
