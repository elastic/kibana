/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type InferenceConnector, InferenceConnectorType } from './connectors';
import { getConnectorModel } from './get_connector_model';

describe('getConnectorModel', () => {
  describe('Azure hostname check', () => {
    it('should return a model from the Azure URL', () => {
      const connector = {
        type: InferenceConnectorType.OpenAI,
        config: {
          apiUrl: 'https://azure.com/v1/models/gpt-4',
        },
      } as unknown as InferenceConnector;

      const model = getConnectorModel(connector);
      expect(model).toBe('gpt-4');
    });

    it('should return a model from the Azure URL with subdomain', () => {
      const connector = {
        type: InferenceConnectorType.OpenAI,
        config: {
          apiUrl: 'https://subdomain.azure.com/v1/models/gpt-4o',
        },
      } as unknown as InferenceConnector;

      const model = getConnectorModel(connector);
      expect(model).toBe('gpt-4o');
    });

    it('should return undefined for unsupported API URL', () => {
      const connector = {
        type: InferenceConnectorType.OpenAI,
        config: {
          apiUrl: 'https://fake-azure.com/v1/models/unknown-model',
        },
      } as unknown as InferenceConnector;

      const model = getConnectorModel(connector);
      expect(model).toBeUndefined();
    });
  });
});
