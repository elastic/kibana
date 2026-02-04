/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGitHubToMcpSerializer, createMcpToGitHubDeserializer } from './github';
import { GITHUB_MCP_SERVER_URL, MCP_AUTH_TYPE } from '../../../../../common';
import type {
  ConnectorFormSchema,
  InternalConnectorForm,
} from '@kbn/alerts-ui-shared/src/common/types';

describe('GitHub to MCP Serializers', () => {
  describe('createGitHubToMcpSerializer', () => {
    const serializer = createGitHubToMcpSerializer();

    it('should transform GitHub form to MCP connector format', () => {
      const input: ConnectorFormSchema = {
        actionTypeId: '',
        isDeprecated: false,
        name: 'My GitHub',
        config: { serverUrl: 'https://api.randomlocation.com/mcp/' },
        secrets: { token: 'github_pat_123' },
      };

      const result = serializer(input);

      expect(result).toEqual({
        actionTypeId: '.mcp',
        isDeprecated: false,
        name: 'My GitHub',
        config: {
          serverUrl: 'https://api.randomlocation.com/mcp/',
          hasAuth: true,
          authType: 'bearer',
        },
        secrets: { token: 'github_pat_123' },
      });
    });

    it('should use default server URL when not provided', () => {
      const input: ConnectorFormSchema = {
        actionTypeId: '',
        isDeprecated: false,
        name: 'My GitHub',
        config: {},
        secrets: { token: 'token123' },
      };

      const result = serializer(input);

      expect(result.config.serverUrl).toBe(GITHUB_MCP_SERVER_URL);
    });

    it('should always set actionTypeId to .mcp', () => {
      const input: ConnectorFormSchema = {
        actionTypeId: '',
        isDeprecated: false,
        name: 'Test',
        config: {},
        secrets: {},
      };

      const result = serializer(input);

      expect(result.actionTypeId).toBe('.mcp');
    });
  });

  describe('createMcpToGitHubDeserializer', () => {
    const deserializer = createMcpToGitHubDeserializer();

    it('should transform MCP connector to GitHub form format', () => {
      const input: InternalConnectorForm = {
        id: 'conn-1',
        actionTypeId: '.mcp',
        isDeprecated: false,
        name: 'My GitHub',
        config: {
          serverUrl: 'https://custom.com/mcp/',
          hasAuth: true,
          authType: 'bearer',
        },
        secrets: {},
      };

      const result = deserializer(input);

      expect(result).toEqual({
        id: 'conn-1',
        actionTypeId: '.mcp',
        isDeprecated: false,
        name: 'My GitHub',
        config: {
          serverUrl: 'https://custom.com/mcp/',
          hasAuth: true,
          authType: 'bearer',
        },
        secrets: { token: '' },
      });
    });

    it('should use default server URL when config is missing', () => {
      const input: InternalConnectorForm = {
        id: 'conn-1',
        actionTypeId: '.mcp',
        isDeprecated: false,
        name: 'Test',
        config: {},
        secrets: {},
      };

      const result = deserializer(input);

      expect(result.config.serverUrl).toBe(GITHUB_MCP_SERVER_URL);
      expect(result.config.authType).toBe(MCP_AUTH_TYPE);
    });

    it('should always clear token field for security', () => {
      const input: InternalConnectorForm = {
        id: 'conn-1',
        actionTypeId: '.mcp',
        isDeprecated: false,
        name: 'Test',
        config: { serverUrl: 'https://test.com' },
        secrets: { token: 'should-not-appear' },
      };

      const result = deserializer(input);

      expect(result.secrets.token).toBe('');
    });
  });
});
