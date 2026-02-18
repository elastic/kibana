/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { z as z4 } from '@kbn/zod/v4';
import { createConnectorTypeFromSpec } from './create_connector_from_spec';
import { WorkflowsConnectorFeatureId } from '../../../common';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import { actionsConfigMock } from '../../actions_config.mock';

describe('createConnectorTypeFromSpec', () => {
  const mockGetAxiosInstanceWithAuth = jest.fn();
  const mockActionsConfigUtils = actionsConfigMock.create();

  const mockActionsPlugin: ActionsPluginSetupContract = {
    getActionsConfigurationUtilities: () => mockActionsConfigUtils,
    getAxiosInstanceWithAuth: mockGetAxiosInstanceWithAuth,
  } as unknown as ActionsPluginSetupContract;

  const createMockSpec = (overrides: Partial<ConnectorSpec> = {}): ConnectorSpec =>
    ({
      metadata: {
        id: 'test-connector',
        displayName: 'Test Connector',
        minimumLicense: 'basic',
        supportedFeatureIds: ['alerting'],
        ...overrides.metadata,
      },
      schema: overrides.schema || z4.object({}),
      auth: overrides.auth || {
        types: ['none'],
      },
      actions: overrides.actions || {
        testAction: {
          input: z4.object({ test: z4.string() }),
          handler: jest.fn(),
        },
      },
    } as ConnectorSpec);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates connector type with executor and params for non-workflows connectors', () => {
    const spec = createMockSpec({
      actions: {
        testAction: {
          input: z4.object({ test: z4.string() }),
          handler: jest.fn(),
        },
      },
    });

    const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

    expect(connectorType.id).toBe('test-connector');
    expect(connectorType.name).toBe('Test Connector');
    expect(connectorType.executor).toBeDefined();
    expect(connectorType.validate.params).toBeDefined();
    expect(connectorType.source).toBe(ACTION_TYPE_SOURCES.spec);
  });

  it('creates connector type with executor and params for workflows connectors with multiple feature IDs', () => {
    const spec = createMockSpec({
      metadata: {
        id: 'workflows-multi-feature-connector',
        description: 'foobar',
        displayName: 'Workflows Multi Feature Connector',
        minimumLicense: 'basic',
        supportedFeatureIds: [WorkflowsConnectorFeatureId, 'alerting'],
      },
      actions: {
        testAction: {
          input: z4.object({ test: z4.string() }),
          handler: jest.fn(),
        },
      },
    });

    const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

    expect(connectorType.id).toBe('workflows-multi-feature-connector');
    expect(connectorType.executor).toBeDefined();
    expect(connectorType.validate.params).toBeDefined();
    expect(connectorType.source).toBe(ACTION_TYPE_SOURCES.spec);
  });

  it('throws an error if the actions are empty', () => {
    const spec = createMockSpec({
      metadata: {
        id: 'workflows-multi-feature-connector-no-actions',
        description: 'foobar',
        displayName: 'Workflows Multi Feature Connector No Actions',
        minimumLicense: 'basic',
        supportedFeatureIds: [WorkflowsConnectorFeatureId, 'alerting'],
      },
      actions: {},
    });

    // This should throw an error because generateParamsSchema requires actions
    expect(() => createConnectorTypeFromSpec(spec, mockActionsPlugin)).toThrow(
      'No actions defined'
    );
  });

  it('always includes config and secrets validators', () => {
    const spec = createMockSpec({
      metadata: {
        id: 'workflows-connector',
        description: 'foobar',
        displayName: 'Workflows Connector',
        minimumLicense: 'basic',
        supportedFeatureIds: [WorkflowsConnectorFeatureId],
      },
    });

    const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

    expect(connectorType.validate.config).toBeDefined();
    expect(connectorType.validate.secrets).toBeDefined();
  });

  it('includes globalAuthHeaders when provided in spec', () => {
    const spec = createMockSpec({
      auth: {
        types: [],
        headers: {
          'X-Custom-Header': 'value',
        },
      },
    });

    const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

    expect(connectorType.globalAuthHeaders).toEqual({
      'X-Custom-Header': 'value',
    });
  });

  describe('params schema validation', () => {
    it('generates params schema correctly', () => {
      const spec = createMockSpec({
        actions: {
          action1: {
            input: z4.object({ field1: z4.string() }),
            handler: jest.fn(),
          },
          action2: {
            input: z4.object({ field2: z4.number() }),
            handler: jest.fn(),
          },
          action3: {
            input: z4.object({ field3: z4.boolean() }),
            handler: jest.fn(),
          },
        },
      });

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      expect(connectorType.validate.params).toBeDefined();

      // Validate action1 params
      const params1 = { subAction: 'action1', subActionParams: { field1: 'test' } };
      expect(() => connectorType.validate.params!.schema.parse(params1)).not.toThrow();
      expect(connectorType.validate.params!.schema.parse(params1)).toEqual(params1);

      // Validate action2 params
      const params2 = { subAction: 'action2', subActionParams: { field2: 123 } };
      expect(() => connectorType.validate.params!.schema.parse(params2)).not.toThrow();
      expect(connectorType.validate.params!.schema.parse(params2)).toEqual(params2);

      // Validate action3 params
      const params3 = { subAction: 'action3', subActionParams: { field3: true } };
      expect(() => connectorType.validate.params!.schema.parse(params3)).not.toThrow();
      expect(connectorType.validate.params!.schema.parse(params3)).toEqual(params3);
    });

    it('rejects invalid subAction', () => {
      const spec = createMockSpec({
        actions: {
          testAction: {
            input: z4.object({ test: z4.string() }),
            handler: jest.fn(),
          },
        },
      });

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      const invalidParams = { subAction: 'invalidAction', subActionParams: { test: 'value' } };
      expect(() => connectorType.validate.params!.schema.parse(invalidParams)).toThrow();
    });

    it('rejects params with missing subActionParams', () => {
      const spec = createMockSpec({
        actions: {
          testAction: {
            input: z4.object({ test: z4.string() }),
            handler: jest.fn(),
          },
        },
      });

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      const invalidParams = { subAction: 'testAction' };
      expect(() => connectorType.validate.params!.schema.parse(invalidParams)).toThrow();
    });

    it('rejects params with invalid subActionParams structure', () => {
      const spec = createMockSpec({
        actions: {
          testAction: {
            input: z4.object({ test: z4.string() }),
            handler: jest.fn(),
          },
        },
      });

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      const invalidParams = {
        subAction: 'testAction',
        subActionParams: { wrongField: 'value' },
      };
      expect(() => connectorType.validate.params!.schema.parse(invalidParams)).toThrow();
    });

    it('rejects params with extra fields due to strict mode', () => {
      const spec = createMockSpec({
        actions: {
          testAction: {
            input: z4.object({ test: z4.string() }),
            handler: jest.fn(),
          },
        },
      });

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      const invalidParams = {
        subAction: 'testAction',
        subActionParams: { test: 'value' },
        extraField: 'should not be allowed',
      };
      expect(() => connectorType.validate.params!.schema.parse(invalidParams)).toThrow();
    });

    it('handles complex nested input schemas', () => {
      const spec = createMockSpec({
        actions: {
          complexAction: {
            input: z4.object({
              nested: z4.object({
                field1: z4.string(),
                field2: z4.array(z4.number()),
              }),
              optional: z4.string().optional(),
            }),
            handler: jest.fn(),
          },
        },
      });

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      const validParams = {
        subAction: 'complexAction',
        subActionParams: {
          nested: {
            field1: 'test',
            field2: [1, 2, 3],
          },
          optional: 'value',
        },
      };
      expect(() => connectorType.validate.params!.schema.parse(validParams)).not.toThrow();
      expect(connectorType.validate.params!.schema.parse(validParams)).toEqual(validParams);
    });
  });

  describe('secrets schema validation', () => {
    it('generates secrets schema correctly', () => {
      const spec = createMockSpec({
        auth: {
          types: [{ type: 'api_key_header', defaults: { headerField: 'Key' } }],
        },
      });

      createConnectorTypeFromSpec(spec, mockActionsPlugin);

      expect(mockActionsConfigUtils.getWebhookSettings).toHaveBeenCalled();
    });

    it('generates secrets schema with pfx enabled', () => {
      mockActionsConfigUtils.getWebhookSettings.mockReturnValue({
        ssl: { pfx: { enabled: true } },
      });

      const spec = createMockSpec({});

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      expect(connectorType.validate.secrets).toBeDefined();
      expect(mockActionsConfigUtils.getWebhookSettings).toHaveBeenCalled();
    });
  });

  describe('config schema validation', () => {
    it('generates schema with authType when schema is provided and authType is provided in the config', () => {
      const schema = z4.object({
        url: z4.string(),
      });

      const spec = createMockSpec({
        schema,
      });

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      expect(connectorType.validate.config).toBeDefined();

      const config = {
        url: 'https://example.com',
        authType: 'basic',
      };

      expect(() => connectorType.validate.config.schema.parse(config)).not.toThrow();
      expect(connectorType.validate.config.schema.parse(config)).toEqual(config);
    });

    it('generates schema with authType when schema is provided and authType is not provided in the config', () => {
      const schema = z4.object({
        url: z4.string(),
      });

      const spec = createMockSpec({
        schema,
      });

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      expect(connectorType.validate.config).toBeDefined();

      const configWithoutAuthType = {
        url: 'https://example.com',
      };

      expect(() => connectorType.validate.config.schema.parse(configWithoutAuthType)).not.toThrow();
      expect(connectorType.validate.config.schema.parse(configWithoutAuthType)).toEqual(
        configWithoutAuthType
      );
    });

    it('generates schema with authType when schema is not provided', () => {
      const spec = createMockSpec();
      spec.schema = undefined;

      const connectorType = createConnectorTypeFromSpec(spec, mockActionsPlugin);

      expect(connectorType.validate.config).toBeDefined();

      const configWithAuthType = { authType: 'basic' };

      expect(() => connectorType.validate.config.schema.parse(configWithAuthType)).not.toThrow();
      expect(connectorType.validate.config.schema.parse(configWithAuthType)).toEqual(
        configWithAuthType
      );
    });
  });
});
