/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTOR_ID, CONNECTOR_NAME, SUB_ACTION } from '@kbn/connector-schemas/mcp/constants';
import { mcpParamsErrorStrings } from './translations';
import { getConnectorType } from './mcp';
import type {
  MCPActionParams,
  MCPInitializeActionParams,
  MCPCallToolActionParams,
  SubActionParamsRaw,
} from './types';

const connectorType = getConnectorType();

describe('mcp connector type', () => {
  it('should expose static metadata', () => {
    expect(connectorType.id).toEqual(CONNECTOR_ID);
    expect(connectorType.actionTypeTitle).toEqual(CONNECTOR_NAME);
    expect(connectorType.selectMessage).toBe('Connect to an MCP (Model Context Protocol) server.');
  });

  describe('validateParams', () => {
    it('should return no errors for non "call_tool" subAction', async () => {
      const params = {
        subAction: SUB_ACTION.INITIALIZE,
      } as MCPInitializeActionParams & SubActionParamsRaw;

      await expect(connectorType.validateParams(params, null)).resolves.toEqual({ errors: {} });
    });

    it('should validate "call_tool" subAction JSON params', async () => {
      const requiredParams = {
        subAction: SUB_ACTION.CALL_TOOL,
        subActionParams: { name: '', arguments: {} },
        subActionParamsRaw: undefined,
      } as MCPCallToolActionParams & SubActionParamsRaw;

      await expect(connectorType.validateParams(requiredParams, null)).resolves.toEqual({
        errors: { subActionParams: [mcpParamsErrorStrings.required] },
      });

      const invalidJsonParams: MCPActionParams = {
        subAction: SUB_ACTION.CALL_TOOL,
        subActionParams: { name: '', arguments: {} },
        subActionParamsRaw: '{',
      };

      await expect(connectorType.validateParams(invalidJsonParams, null)).resolves.toEqual({
        errors: { subActionParams: [mcpParamsErrorStrings.invalidJson] },
      });

      const validParams: MCPActionParams = {
        subAction: SUB_ACTION.CALL_TOOL,
        subActionParams: { name: 'foo', arguments: {} },
        subActionParamsRaw: '{"foo":"bar"}',
      };

      await expect(connectorType.validateParams(validParams, null)).resolves.toEqual({
        errors: { subActionParams: [] },
      });
    });
  });
});
