/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { McpToolDefinition } from '@kbn/agent-builder-common/tools';
import { ToolType } from '@kbn/agent-builder-common';
import type { McpToolFormData } from '../components/tools/form/types/tool_form_types';
import {
  transformMcpToolToFormData,
  transformFormDataToMcpTool,
  transformMcpFormDataForCreate,
  transformMcpFormDataForUpdate,
} from './transform_mcp_form_data';

describe('transformMcpFormData', () => {
  const formData: McpToolFormData = {
    toolId: 'my-mcp-tool',
    description: 'An MCP tool for testing.',
    connectorId: 'connector-123',
    mcpToolName: 'my_mcp_tool_name',
    confirmation_ask_user: 'never',
    labels: ['test', 'mcp'],
    type: ToolType.mcp,
  };

  const defaultMcpTool: McpToolDefinition = {
    id: 'my-mcp-tool',
    description: 'An MCP tool for testing.',
    readonly: false,
    experimental: false,
    configuration: {
      connector_id: 'connector-123',
      tool_name: 'my_mcp_tool_name',
    },
    confirmation: { askUser: 'never' },
    type: ToolType.mcp,
    tags: ['test', 'mcp'],
  };

  describe('transformMcpToolToFormData', () => {
    it('should transform an MCP tool to form data', () => {
      const result = transformMcpToolToFormData(defaultMcpTool);
      expect(result).toEqual(formData);
    });

    it('defaults confirmation_ask_user to never when tool has no confirmation', () => {
      const result = transformMcpToolToFormData(defaultMcpTool);
      expect(result.confirmation_ask_user).toBe('never');
    });

    it('maps confirmation.askUser always to confirmation_ask_user', () => {
      const toolWithConfirmation: McpToolDefinition = {
        ...defaultMcpTool,
        confirmation: { askUser: 'always' },
      };

      const result = transformMcpToolToFormData(toolWithConfirmation);
      expect(result.confirmation_ask_user).toBe('always');
    });

    it('maps confirmation.askUser once to confirmation_ask_user', () => {
      const toolWithConfirmation: McpToolDefinition = {
        ...defaultMcpTool,
        confirmation: { askUser: 'once' },
      };

      const result = transformMcpToolToFormData(toolWithConfirmation);
      expect(result.confirmation_ask_user).toBe('once');
    });
  });

  describe('transformFormDataToMcpTool', () => {
    it('should transform form data to an MCP tool', () => {
      const result = transformFormDataToMcpTool(formData);
      expect(result).toEqual(defaultMcpTool);
    });

    it('sets confirmation when confirmation_ask_user is never', () => {
      const result = transformFormDataToMcpTool({
        ...formData,
        confirmation_ask_user: 'never',
      });
      expect(result.confirmation).toEqual({ askUser: 'never' });
    });

    it('sets confirmation when confirmation_ask_user is once', () => {
      const result = transformFormDataToMcpTool({
        ...formData,
        confirmation_ask_user: 'once',
      });
      expect(result.confirmation).toEqual({ askUser: 'once' });
    });

    it('sets confirmation when confirmation_ask_user is always', () => {
      const result = transformFormDataToMcpTool({
        ...formData,
        confirmation_ask_user: 'always',
      });
      expect(result.confirmation).toEqual({ askUser: 'always' });
    });
  });

  describe('transformMcpFormDataForCreate', () => {
    it('should transform MCP form data to a create tool payload', () => {
      const expectedPayload = omit(defaultMcpTool, ['readonly', 'experimental']);
      const result = transformMcpFormDataForCreate(formData);
      expect(result).toEqual(expectedPayload);
    });

    it('includes confirmation in the create payload when policy is not never', () => {
      const result = transformMcpFormDataForCreate({
        ...formData,
        confirmation_ask_user: 'once',
      });
      expect(result.confirmation).toEqual({ askUser: 'once' });
    });

    it('omits confirmation from the create payload when policy is never', () => {
      const result = transformMcpFormDataForCreate({
        ...formData,
        confirmation_ask_user: 'never',
      });
      expect(result.confirmation).toMatchObject({ askUser: 'never' });
    });
  });

  describe('transformMcpFormDataForUpdate', () => {
    it('should transform MCP form data to an update tool payload', () => {
      const expectedPayload = omit(defaultMcpTool, ['id', 'type', 'readonly', 'experimental']);
      const result = transformMcpFormDataForUpdate(formData);
      expect(result).toEqual(expectedPayload);
    });

    it('includes confirmation in the update payload when policy is not never', () => {
      const result = transformMcpFormDataForUpdate({
        ...formData,
        confirmation_ask_user: 'always',
      });
      expect(result.confirmation).toEqual({ askUser: 'always' });
    });

    it('omits confirmation from the update payload when policy is never', () => {
      const result = transformMcpFormDataForUpdate({
        ...formData,
        confirmation_ask_user: 'never',
      });
      expect(result.confirmation).toEqual({ askUser: 'never' });
    });
  });
});
