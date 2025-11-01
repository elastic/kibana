/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createProviderMetadata } from './provider_metadata';
import type { ToolProviderMetadata } from './client';

describe('Provider Metadata', () => {
  describe('createProviderMetadata', () => {
    it('should create provider metadata with correct structure', () => {
      const metadata = createProviderMetadata('github-connector', 'GitHub MCP Server');

      expect(metadata).toEqual({
        id: 'mcp.github-connector',
        name: 'GitHub MCP Server',
        type: 'mcp',
        uniqueId: 'github-connector',
      });
    });

    it('should include optional description when provided', () => {
      const metadata = createProviderMetadata(
        'github-connector',
        'GitHub MCP Server',
        'Use for GitHub operations'
      );

      expect(metadata).toEqual({
        id: 'mcp.github-connector',
        name: 'GitHub MCP Server',
        type: 'mcp',
        uniqueId: 'github-connector',
        description: 'Use for GitHub operations',
      });
    });

    it('should handle different connector IDs', () => {
      const testCases: Array<{
        uniqueId: string;
        connectorName: string;
        expectedId: string;
      }> = [
        {
          uniqueId: 'slack',
          connectorName: 'Slack Connector',
          expectedId: 'mcp.slack',
        },
        {
          uniqueId: 'github-enterprise',
          connectorName: 'GitHub Enterprise',
          expectedId: 'mcp.github-enterprise',
        },
        {
          uniqueId: 'filesystem-local',
          connectorName: 'Local Filesystem',
          expectedId: 'mcp.filesystem-local',
        },
      ];

      testCases.forEach(({ uniqueId, connectorName, expectedId }) => {
        const metadata = createProviderMetadata(uniqueId, connectorName);
        expect(metadata.id).toBe(expectedId);
        expect(metadata.name).toBe(connectorName);
        expect(metadata.uniqueId).toBe(uniqueId);
      });
    });

    it('should always set type to "mcp"', () => {
      const metadata1 = createProviderMetadata('connector1', 'Connector 1');
      const metadata2 = createProviderMetadata('connector2', 'Connector 2');

      expect(metadata1.type).toBe('mcp');
      expect(metadata2.type).toBe('mcp');
    });

    it('should handle connector names with special characters', () => {
      const metadata = createProviderMetadata(
        'my-connector',
        'My Connector: Special Edition (v2.0)'
      );

      expect(metadata.name).toBe('My Connector: Special Edition (v2.0)');
      expect(metadata.id).toBe('mcp.my-connector');
    });

    it('should create valid provider metadata that can be used in tools', () => {
      const metadata = createProviderMetadata('test-connector', 'Test Connector');

      // Verify it has all required fields
      const requiredFields: Array<keyof ToolProviderMetadata> = ['id', 'name', 'type', 'uniqueId'];

      requiredFields.forEach((field) => {
        expect(metadata).toHaveProperty(field);
        expect(metadata[field]).toBeDefined();
      });
    });

    it('should be consistent for the same inputs', () => {
      const metadata1 = createProviderMetadata('github', 'GitHub');
      const metadata2 = createProviderMetadata('github', 'GitHub');

      expect(metadata1).toEqual(metadata2);
    });

    it('should format provider ID with mcp namespace prefix', () => {
      const metadata = createProviderMetadata('my-connector', 'My Connector');

      expect(metadata.id).toMatch(/^mcp\./);
      expect(metadata.id).toBe('mcp.my-connector');
    });
  });

  describe('Provider Metadata Integration', () => {
    it('should work with Tool interface', () => {
      const providerMetadata = createProviderMetadata('slack-connector', 'Slack MCP Server');

      const tool = {
        name: 'send_message',
        description: 'Send a message to a Slack channel',
        inputSchema: {
          type: 'object' as const,
          properties: {
            channel: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['channel', 'message'],
        },
        provider: providerMetadata,
      };

      expect(tool.provider).toBeDefined();
      expect(tool.provider?.id).toBe('mcp.slack-connector');
      expect(tool.provider?.type).toBe('mcp');
      expect(tool.provider?.uniqueId).toBe('slack-connector');
    });

    it('should work with CallToolResponse interface', () => {
      const providerMetadata = createProviderMetadata('github', 'GitHub MCP Server');

      const response = {
        content: [
          {
            type: 'text' as const,
            text: 'Tool executed successfully',
          },
        ],
        provider: providerMetadata,
      };

      expect(response.provider).toBeDefined();
      expect(response.provider?.id).toBe('mcp.github');
      expect(response.provider?.name).toBe('GitHub MCP Server');
    });
  });

  describe('Provider Metadata for Audit Trails', () => {
    it('should provide enough information for audit logging', () => {
      const metadata = createProviderMetadata('production-connector', 'Production MCP Connector');

      // Verify all audit-relevant fields are present
      expect(metadata.id).toBeDefined(); // Unique identifier
      expect(metadata.name).toBeDefined(); // Human-readable name
      expect(metadata.type).toBeDefined(); // Provider type
      expect(metadata.uniqueId).toBeDefined(); // Source connector unique ID

      // Verify we can construct an audit message
      const auditMessage = `Tool provided by ${metadata.name} (${metadata.type}) via connector ${metadata.uniqueId}`;
      expect(auditMessage).toBe(
        'Tool provided by Production MCP Connector (mcp) via connector production-connector'
      );
    });
  });

  describe('Provider Metadata for UI Display', () => {
    it('should provide displayable information', () => {
      const metadata = createProviderMetadata('slack-workspace', 'Slack Workspace MCP');

      // Name is suitable for display
      expect(metadata.name).toBeTruthy();
      expect(typeof metadata.name).toBe('string');
      expect(metadata.name.length).toBeGreaterThan(0);

      // Type can be used for icon/badge display
      expect(metadata.type).toBe('mcp');

      // ID can be used for deep linking or filtering
      expect(metadata.id).toBeTruthy();
      expect(metadata.id).toContain('mcp.');
    });
  });
});
