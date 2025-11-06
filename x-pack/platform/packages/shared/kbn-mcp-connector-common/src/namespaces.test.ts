/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MCP_NAMESPACE_PREFIX, isMcpToolId, createMcpToolId, parseMcpToolId } from './namespaces';

describe('MCP Namespaces', () => {
  describe('MCP_NAMESPACE_PREFIX', () => {
    it('should be "mcp"', () => {
      expect(MCP_NAMESPACE_PREFIX).toBe('mcp');
    });
  });

  describe('isMcpToolId', () => {
    it('should return true for MCP tool IDs', () => {
      expect(isMcpToolId('mcp.github.get_issues')).toBe(true);
      expect(isMcpToolId('mcp.slack.send_message')).toBe(true);
      expect(isMcpToolId('mcp.my-connector.tool-name')).toBe(true);
    });

    it('should return false for non-MCP tool IDs', () => {
      expect(isMcpToolId('platform.core.search')).toBe(false);
      expect(isMcpToolId('platformCore.execute_esql')).toBe(false);
      expect(isMcpToolId('custom.my-tool')).toBe(false);
      expect(isMcpToolId('my-tool')).toBe(false);
    });

    it('should return false for IDs that just start with "mcp" without dot', () => {
      expect(isMcpToolId('mcptool')).toBe(false);
      expect(isMcpToolId('mcp')).toBe(false);
      expect(isMcpToolId('mcpconnector')).toBe(false);
    });
  });

  describe('createMcpToolId', () => {
    it('should create properly formatted MCP tool IDs', () => {
      expect(createMcpToolId('github', 'get_issues')).toBe('mcp.github.get_issues');
      expect(createMcpToolId('slack-connector', 'send_message')).toBe(
        'mcp.slack-connector.send_message'
      );
    });

    it('should handle tool names with dots', () => {
      expect(createMcpToolId('my-connector', 'namespace.tool')).toBe(
        'mcp.my-connector.namespace.tool'
      );
    });

    it('should handle connector IDs with various valid characters', () => {
      expect(createMcpToolId('my-connector-1', 'tool')).toBe('mcp.my-connector-1.tool');
      expect(createMcpToolId('connector_name', 'tool')).toBe('mcp.connector_name.tool');
      expect(createMcpToolId('connector123', 'tool')).toBe('mcp.connector123.tool');
    });
  });

  describe('parseMcpToolId', () => {
    it('should parse valid MCP tool IDs', () => {
      expect(parseMcpToolId('mcp.github.get_issues')).toEqual({
        uniqueId: 'github',
        toolName: 'get_issues',
      });

      expect(parseMcpToolId('mcp.slack-connector.send_message')).toEqual({
        uniqueId: 'slack-connector',
        toolName: 'send_message',
      });
    });

    it('should handle tool names with dots', () => {
      expect(parseMcpToolId('mcp.my-connector.namespace.tool.name')).toEqual({
        uniqueId: 'my-connector',
        toolName: 'namespace.tool.name',
      });
    });

    it('should return null for non-MCP tool IDs', () => {
      expect(parseMcpToolId('platform.core.search')).toBeNull();
      expect(parseMcpToolId('platformCore.execute_esql')).toBeNull();
      expect(parseMcpToolId('custom.my-tool')).toBeNull();
      expect(parseMcpToolId('my-tool')).toBeNull();
    });

    it('should return null for malformed MCP tool IDs', () => {
      expect(parseMcpToolId('mcp')).toBeNull();
      expect(parseMcpToolId('mcp.')).toBeNull();
      expect(parseMcpToolId('mcp.connector')).toBeNull();
      expect(parseMcpToolId('mcp..tool')).toBeNull();
    });

    it('should be reversible with createMcpToolId', () => {
      const uniqueId = 'github-connector';
      const toolName = 'get.issues';

      const toolId = createMcpToolId(uniqueId, toolName);
      const parsed = parseMcpToolId(toolId);

      expect(parsed).not.toBeNull();
      expect(parsed!.uniqueId).toBe(uniqueId);
      expect(parsed!.toolName).toBe(toolName);
    });
  });

  describe('integration scenarios', () => {
    it('should create, verify, and parse MCP tool IDs', () => {
      const uniqueId = 'github-connector';
      const toolName = 'get_issues';

      // Create MCP tool ID
      const toolId = createMcpToolId(uniqueId, toolName);
      expect(toolId).toBe('mcp.github-connector.get_issues');

      // Verify it's an MCP tool
      expect(isMcpToolId(toolId)).toBe(true);

      // Parse it back
      const parsed = parseMcpToolId(toolId);
      expect(parsed).toEqual({ uniqueId, toolName });
    });
  });
});
