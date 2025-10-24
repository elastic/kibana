/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  protectedNamespaces,
  MCP_NAMESPACE_PREFIX,
  isMcpToolId,
  createMcpToolId,
  parseMcpToolId,
  validateToolNamespace,
} from './namespaces';

describe('MCP Namespaces', () => {
  describe('protectedNamespaces', () => {
    it('should include platformCore and mcp', () => {
      expect(protectedNamespaces).toEqual(['platformCore', 'mcp']);
    });
  });

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

  describe('validateToolNamespace', () => {
    describe('protected namespace validation', () => {
      it('should throw for platformCore namespace without permission', () => {
        expect(() => {
          validateToolNamespace('platformCore.custom-tool', []);
        }).toThrow('Tool ID "platformCore.custom-tool" uses protected namespace "platformCore"');
      });

      it('should throw for mcp namespace without permission', () => {
        expect(() => {
          validateToolNamespace('mcp.custom-connector.tool', []);
        }).toThrow('Tool ID "mcp.custom-connector.tool" uses protected namespace "mcp"');
      });

      it('should throw for nested platformCore namespace', () => {
        expect(() => {
          validateToolNamespace('platformCore.sub.custom-tool', []);
        }).toThrow(
          'Tool ID "platformCore.sub.custom-tool" uses protected namespace "platformCore"'
        );
      });
    });

    describe('allowed namespace validation', () => {
      it('should not throw when namespace is in allowedNamespaces', () => {
        expect(() => {
          validateToolNamespace('platformCore.search', ['platformCore']);
        }).not.toThrow();
      });

      it('should not throw when parent namespace is in allowedNamespaces', () => {
        expect(() => {
          validateToolNamespace('platformCore.sub.tool', ['platformCore']);
        }).not.toThrow();
      });

      it('should not throw for MCP tools with mcp in allowedNamespaces', () => {
        expect(() => {
          validateToolNamespace('mcp.github.get_issues', ['mcp']);
        }).not.toThrow();
      });
    });

    describe('non-protected namespace validation', () => {
      it('should not throw for non-protected namespaces', () => {
        expect(() => {
          validateToolNamespace('custom.my-tool', []);
        }).not.toThrow();

        expect(() => {
          validateToolNamespace('observability.logs-query', []);
        }).not.toThrow();

        expect(() => {
          validateToolNamespace('security.alert-search', []);
        }).not.toThrow();
      });

      it('should not throw for tools without namespace', () => {
        expect(() => {
          validateToolNamespace('my-tool', []);
        }).not.toThrow();
      });
    });

    describe('edge cases', () => {
      it('should handle empty allowedNamespaces array', () => {
        expect(() => {
          validateToolNamespace('custom.tool', []);
        }).not.toThrow();
      });

      it('should handle tools with multiple dots', () => {
        expect(() => {
          validateToolNamespace('custom.domain.subdomain.tool', []);
        }).not.toThrow();
      });

      it('should be case-sensitive', () => {
        // 'platformCore' is protected, but 'PlatformCore' is not
        expect(() => {
          validateToolNamespace('PlatformCore.tool', []);
        }).not.toThrow();
      });

      it('should handle allowedNamespaces correctly', () => {
        // If platformCore is allowed, all platformCore.* tools are allowed
        expect(() => {
          validateToolNamespace('platformCore.sub.tool', ['platformCore']);
        }).not.toThrow();

        expect(() => {
          validateToolNamespace('platformCore.other.tool', ['platformCore']);
        }).not.toThrow();

        // But without platformCore in allowed list, they're not allowed
        expect(() => {
          validateToolNamespace('platformCore.sub.tool', ['other']);
        }).toThrow();
      });
    });

    describe('error messages', () => {
      it('should include the tool ID in error message', () => {
        expect(() => {
          validateToolNamespace('platformCore.custom', []);
        }).toThrow('Tool ID "platformCore.custom"');
      });

      it('should include the namespace in error message', () => {
        expect(() => {
          validateToolNamespace('platformCore.custom', []);
        }).toThrow('namespace "platformCore"');
      });

      it('should list protected namespaces in error message', () => {
        expect(() => {
          validateToolNamespace('platformCore.custom', []);
        }).toThrow('Protected namespaces: platformCore, mcp');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should enforce MCP namespace for MCP connector tools', () => {
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

      // Validate namespace (MCP tools should use 'mcp' namespace)
      expect(() => {
        validateToolNamespace(toolId, ['mcp']);
      }).not.toThrow();
    });

    it('should prevent user tools from using protected namespaces', () => {
      const userToolIds = [
        'platformCore.custom',
        'mcp.my-connector.tool',
        'platformCore.namespace.tool',
      ];

      userToolIds.forEach((toolId) => {
        expect(() => {
          validateToolNamespace(toolId, []); // User tools have no allowed namespaces
        }).toThrow(/uses protected namespace/);
      });
    });

    it('should allow platform tools to use protected namespaces', () => {
      const platformToolIds = [
        'platformCore.search',
        'platformCore.execute_esql',
        'platformCore.core.index_explorer',
      ];

      platformToolIds.forEach((toolId) => {
        expect(() => {
          validateToolNamespace(toolId, ['platformCore']);
        }).not.toThrow();
      });
    });
  });
});
