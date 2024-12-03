/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ConnectorAdapterRegistry } from './connector_adapter_registry';
import type { ConnectorAdapter } from './types';
import {
  bulkValidateConnectorAdapterActionParams,
  validateConnectorAdapterActionParams,
} from './validate_rule_action_params';

describe('validateRuleActionParams', () => {
  const firstConnectorAdapter: ConnectorAdapter = {
    connectorTypeId: '.test',
    ruleActionParamsSchema: schema.object({ foo: schema.string() }),
    buildActionParams: jest.fn(),
  };

  const secondConnectorAdapter: ConnectorAdapter = {
    connectorTypeId: '.test-2',
    ruleActionParamsSchema: schema.object({ bar: schema.string() }),
    buildActionParams: jest.fn(),
  };

  let registry: ConnectorAdapterRegistry;

  beforeEach(() => {
    registry = new ConnectorAdapterRegistry();
  });

  describe('validateConnectorAdapterActionParams', () => {
    it('should validate correctly invalid params', () => {
      registry.register(firstConnectorAdapter);

      expect(() =>
        validateConnectorAdapterActionParams({
          connectorAdapterRegistry: registry,
          connectorTypeId: firstConnectorAdapter.connectorTypeId,
          params: { foo: 5 },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid system action params. System action type: .test - [foo]: expected value of type [string] but got [number]"`
      );
    });

    it('should not throw if the connectorTypeId is not defined', () => {
      registry.register(firstConnectorAdapter);

      expect(() =>
        validateConnectorAdapterActionParams({
          connectorAdapterRegistry: registry,
          params: {},
        })
      ).not.toThrow();
    });

    it('should not throw if the connector adapter is not registered', () => {
      expect(() =>
        validateConnectorAdapterActionParams({
          connectorAdapterRegistry: registry,
          connectorTypeId: firstConnectorAdapter.connectorTypeId,
          params: {},
        })
      ).not.toThrow();
    });
  });

  describe('bulkValidateConnectorAdapterActionParams', () => {
    it('should validate correctly invalid params with multiple actions', () => {
      const actions = [
        { actionTypeId: firstConnectorAdapter.connectorTypeId, params: { foo: 5 } },
        { actionTypeId: secondConnectorAdapter.connectorTypeId, params: { bar: 'test' } },
      ];

      registry.register(firstConnectorAdapter);
      registry.register(secondConnectorAdapter);

      expect(() =>
        bulkValidateConnectorAdapterActionParams({
          connectorAdapterRegistry: registry,
          actions,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid system action params. System action type: .test - [foo]: expected value of type [string] but got [number]"`
      );
    });
  });
});
