/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import {
  fetchConnectorSpec,
  transformSpecToActionTypeModel,
  type ConnectorSpecResponse,
} from './use_action_type_model_utils';

describe('use_action_type_model_utils', () => {
  describe('fetchConnectorSpec', () => {
    const http = httpServiceMock.createStartContract();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls the correct API endpoint with connector ID', async () => {
      const mockResponse: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: {
          type: 'object',
          properties: {},
        },
      };
      http.get.mockResolvedValue(mockResponse);

      const result = await fetchConnectorSpec(http, 'test-connector');

      expect(http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/test-connector/spec',
        { signal: undefined }
      );
      expect(result).toEqual(mockResponse);
    });

    it('URL-encodes connector ID with special characters', async () => {
      const mockResponse: ConnectorSpecResponse = {
        metadata: {
          id: '.test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };
      http.get.mockResolvedValue(mockResponse);

      await fetchConnectorSpec(http, '.test-connector');

      expect(http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/.test-connector/spec',
        { signal: undefined }
      );
    });

    it('passes abort signal when provided', async () => {
      const mockResponse: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };
      http.get.mockResolvedValue(mockResponse);

      const abortController = new AbortController();
      await fetchConnectorSpec(http, 'test-connector', abortController.signal);

      expect(http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/test-connector/spec',
        { signal: abortController.signal }
      );
    });
  });

  describe('transformSpecToActionTypeModel', () => {
    const baseSpec: ConnectorSpecResponse = {
      metadata: {
        id: 'test-connector',
        displayName: 'Test Connector',
        description: 'A test connector description',
        minimumLicense: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      schema: {
        type: 'object',
        properties: {
          config: { type: 'object', properties: {} },
          secrets: { type: 'object', properties: {} },
        },
      },
    };

    it('creates ActionTypeModel with correct id', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.id).toBe('test-connector');
    });

    it('creates ActionTypeModel with correct title from displayName', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.actionTypeTitle).toBe('Test Connector');
    });

    it('creates ActionTypeModel with correct selectMessage from description', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.selectMessage).toBe('A test connector description');
    });

    it('sets source to spec', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.source).toBe(ACTION_TYPE_SOURCES.spec);
    });

    it('sets isExperimental to false', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.isExperimental).toBe(false);
    });

    it('sets subtype to undefined', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.subtype).toBeUndefined();
    });

    it('creates lazy actionConnectorFields component', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.actionConnectorFields).toBeDefined();
      expect(typeof model.actionConnectorFields).toBe('object');
    });

    it('creates lazy actionParamsFields component', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.actionParamsFields).toBeDefined();
      expect(typeof model.actionParamsFields).toBe('object');
    });

    it('creates validateParams function that returns empty errors', async () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      const result = await model.validateParams({});
      expect(result).toEqual({ errors: {} });
    });

    it('creates connectorForm with serializer and deserializer', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.connectorForm).toBeDefined();
      expect(model.connectorForm?.serializer).toBeDefined();
      expect(model.connectorForm?.deserializer).toBeDefined();
    });

    describe('icon resolution', () => {
      it('uses icon from spec metadata when provided', () => {
        const specWithIcon: ConnectorSpecResponse = {
          ...baseSpec,
          metadata: {
            ...baseSpec.metadata,
            icon: 'custom-icon',
          },
        };
        const model = transformSpecToActionTypeModel(specWithIcon);
        expect(model.iconClass).toBe('custom-icon');
      });

      it('falls back to plugs icon when no icon specified and not in icon map', () => {
        const model = transformSpecToActionTypeModel(baseSpec);
        // Since test-connector is not in ConnectorIconsMap, it should fall back to 'plugs'
        expect(model.iconClass).toBe('plugs');
      });
    });
  });

  describe('connectorForm serializer', () => {
    it('copies authType from secrets to config when present', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const serializer = model.connectorForm?.serializer;

      const formData = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { authType: 'api_key', apiKey: 'secret' },
      };

      const result = serializer?.(formData);

      expect(result?.config).toEqual({
        someField: 'value',
        authType: 'api_key',
      });
      expect(result?.secrets).toEqual({ authType: 'api_key', apiKey: 'secret' });
    });

    it('does not modify data when authType is not present in secrets', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const serializer = model.connectorForm?.serializer;

      const formData = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { apiKey: 'secret' },
      };

      const result = serializer?.(formData);

      expect(result).toEqual(formData);
    });
  });

  describe('connectorForm deserializer', () => {
    it('copies authType from config to secrets when present and secrets does not have it', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const deserializer = model.connectorForm?.deserializer;

      const apiData = {
        name: 'My Connector',
        config: { someField: 'value', authType: 'api_key' },
        secrets: {},
      };

      const result = deserializer?.(apiData);

      expect(result?.secrets).toEqual({ authType: 'api_key' });
      expect(result?.config).toEqual({ someField: 'value', authType: 'api_key' });
    });

    it('does not overwrite authType in secrets if already present', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const deserializer = model.connectorForm?.deserializer;

      const apiData = {
        name: 'My Connector',
        config: { authType: 'api_key' },
        secrets: { authType: 'bearer_token' },
      };

      const result = deserializer?.(apiData);

      // Should keep the existing authType in secrets
      expect(result?.secrets).toEqual({ authType: 'bearer_token' });
    });

    it('does not modify data when config has no authType', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const deserializer = model.connectorForm?.deserializer;

      const apiData = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { apiKey: 'secret' },
      };

      const result = deserializer?.(apiData);

      expect(result).toEqual(apiData);
    });
  });
});
