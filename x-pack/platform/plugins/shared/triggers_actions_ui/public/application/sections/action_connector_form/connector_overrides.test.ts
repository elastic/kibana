/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorOverrides } from './connector_overrides';
import type { ConnectorFormSchema, InferenceConnectorProviderConfig } from './types';

function getData(config: ConnectorFormSchema['config']) {
  return {
    actionTypeId: '.inference',
    isPreconfigured: false,
    isDeprecated: false,
    referencedByCount: 0,
    isMissingSecrets: false,
    isSystemAction: false,
    id: 'test-id',
    name: 'test-name',
    config: {
      provider: 'openai',
      taskType: 'chat_completion',
      inferenceId: 'openai-chat_completion-qnn5arzkrwk',
      ...config,
    },
    actionType: 'AI Connector',
    compatibility: ['Generative AI for Security'],
    secrets: {},
  };
}

describe('connectorOverrides', () => {
  describe('Inference connector type', () => {
    const connectorId = '.inference';
    let formDeserializer: (data: ConnectorFormSchema) => ConnectorFormSchema;
    let formSerializer: (data: ConnectorFormSchema) => ConnectorFormSchema;

    beforeAll(() => {
      const overrides = connectorOverrides(connectorId);
      formDeserializer = overrides!.formDeserializer;
      formSerializer = overrides!.formSerializer;
    });

    it('should return form serializer, deserializer, and connector settings title property', async () => {
      const overrides = connectorOverrides(connectorId);
      expect(overrides).toHaveProperty('formSerializer');
      expect(overrides).toHaveProperty('formDeserializer');
      expect(overrides).toHaveProperty('shouldHideConnectorSettingsTitle');
    });

    describe('Deserializer', () => {
      const dataToBeDeserialized = getData({
        providerConfig: {
          api_key: null,
          organization_id: null,
          'rate_limit.requests_per_minute': null,
          model_id: 'gpt-4.1',
          url: null,
          adaptive_allocations: {
            max_number_of_allocations: 4,
            min_number_of_allocations: 0,
          },
        },
        headers: {
          'custom-test-key': 'custom-test-value',
        },
        taskTypeConfig: {},
      });
      const deserializedData = getData({
        providerConfig: {
          api_key: null,
          organization_id: null,
          'rate_limit.requests_per_minute': null,
          model_id: 'gpt-4.1',
          url: null,
          headers: {
            'custom-test-key': 'custom-test-value',
          },
          max_number_of_allocations: 4,
        },
        taskTypeConfig: {},
      });

      it('should move headers into the provider config as the form expects', async () => {
        const deserialized = formDeserializer(dataToBeDeserialized);
        expect(deserialized).toEqual(deserializedData);
        expect(deserialized.config.providerConfig).toHaveProperty('headers');
        expect(deserialized.config).not.toHaveProperty('headers');
      });

      it('should move max allocations out of adaptive allocations so it displays correctly in the form', async () => {
        const deserialized = formDeserializer(dataToBeDeserialized);
        expect(deserialized).toEqual(deserializedData);
        expect(deserialized.config.providerConfig).toHaveProperty('max_number_of_allocations');
        expect(
          (deserialized.config.providerConfig as InferenceConnectorProviderConfig)
            .adaptive_allocations
        ).toBeUndefined();
      });
    });

    describe('Serializer', () => {
      const dataToBeSerialized = getData({
        providerConfig: {
          max_number_of_allocations: 4,
          api_key: null,
          organization_id: null,
          'rate_limit.requests_per_minute': null,
          model_id: 'gpt-4.1',
          url: null,
          headers: {
            'test-header-key-1': 'test-header-value-1',
            'test-header-key-2': 'test-header-value-2',
          },
        },
      });

      const serializedData = getData({
        providerConfig: {
          api_key: null,
          organization_id: null,
          'rate_limit.requests_per_minute': null,
          model_id: 'gpt-4.1',
          url: null,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 0,
            max_number_of_allocations: 4,
          },
          num_threads: 1,
        },
        headers: {
          'test-header-key-1': 'test-header-value-1',
          'test-header-key-2': 'test-header-value-2',
        },
      });

      it('should move headers out of the provider config', async () => {
        const serialized = formSerializer(dataToBeSerialized);
        expect(serialized).toEqual(serializedData);
        expect(serialized.config.providerConfig).not.toHaveProperty('headers');
        expect(serialized.config).toHaveProperty('headers');
        expect(serialized.config.headers).toEqual({
          'test-header-key-1': 'test-header-value-1',
          'test-header-key-2': 'test-header-value-2',
        });
      });

      it('should move max allocations into adaptive allocations object in provider config', async () => {
        const serialized = formSerializer(dataToBeSerialized);
        expect(serialized).toEqual(serializedData);
        expect(serialized.config.providerConfig).not.toHaveProperty('max_number_of_allocations');
        expect(serialized.config.providerConfig).toHaveProperty('adaptive_allocations');
        expect(
          (serialized.config.providerConfig as InferenceConnectorProviderConfig)
            .adaptive_allocations
        ).toHaveProperty('max_number_of_allocations', 4);
        expect(
          (serialized.config.providerConfig as InferenceConnectorProviderConfig)
            .adaptive_allocations
        ).toHaveProperty('min_number_of_allocations', 0);
        expect(
          (serialized.config.providerConfig as InferenceConnectorProviderConfig)
            .adaptive_allocations
        ).toHaveProperty('enabled', true);
        expect(serialized.config.providerConfig).toHaveProperty('num_threads', 1);
      });
    });
  });
});
